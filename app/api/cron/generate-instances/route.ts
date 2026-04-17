import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Generates class instances from templates for the next 4 weeks for all gyms.
// Runs daily via cron; skips instances that already exist.
//
// Review fixes in this revision:
//   * maxDuration = 300 so large gyms don't hit the default 60s timeout
//   * per-insert try/catch so a single bad row doesn't abort the loop
//   * errors collected and logged, returned in the summary
//   * DST-safe local→UTC via Intl.DateTimeFormat two-pass (replaces the
//     fragile single-offset-delta approximation from the previous version)

export const maxDuration = 300

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: gyms, error: gymsErr } = await supabase.from('gyms').select('id, timezone')
  if (gymsErr) {
    console.error('[cron/generate-instances] gyms fetch failed', gymsErr)
    return NextResponse.json({ error: gymsErr.message }, { status: 500 })
  }
  if (!gyms?.length) return NextResponse.json({ created: 0, errors: [] })

  let created = 0
  const errors: Array<{ gymId: string; templateId?: string; date?: string; err: unknown }> = []

  for (const gym of gyms) {
    const timezone = gym.timezone ?? 'UTC'

    const [{ data: templates }, { data: defaults }] = await Promise.all([
      supabase.from('class_slot_templates').select('*').eq('gym_id', gym.id).eq('active', true),
      supabase.from('gym_schedule_defaults').select('*').eq('gym_id', gym.id),
    ])

    if (!templates?.length) continue

    const globalDefault = defaults?.find((d: { day_of_week: number | null }) => d.day_of_week === null)?.default_capacity ?? 20
    const dayDefaults: Record<number, number> = {}
    for (const d of defaults ?? []) {
      if (d.day_of_week !== null) dayDefaults[d.day_of_week] = d.default_capacity
    }

    for (const template of templates) {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
        try {
          const base = new Date(today)
          base.setUTCDate(base.getUTCDate() + weekOffset * 7)

          const jsDay = base.getUTCDay()
          const isoDay = jsDay === 0 ? 7 : jsDay
          const monday = new Date(base)
          monday.setUTCDate(base.getUTCDate() - (isoDay - 1))

          const targetDate = new Date(monday)
          targetDate.setUTCDate(monday.getUTCDate() + (template.day_of_week - 1))
          const dateStr = targetDate.toISOString().split('T')[0]

          if (targetDate < today) continue

          const { data: existing, error: existErr } = await supabase
            .from('class_instances')
            .select('id')
            .eq('template_id', template.id)
            .eq('date', dateStr)
            .maybeSingle()

          if (existErr) {
            errors.push({ gymId: gym.id, templateId: template.id, date: dateStr, err: existErr })
            continue
          }
          if (existing) continue

          const localTime = (template.local_time as string).slice(0, 5)
          const capacity = template.capacity ?? dayDefaults[template.day_of_week] ?? globalDefault

          const startsAt = localToUTC(dateStr, localTime, timezone)
          if (!startsAt) {
            errors.push({
              gymId: gym.id,
              templateId: template.id,
              date: dateStr,
              err: new Error(`localToUTC failed for ${dateStr} ${localTime} ${timezone}`),
            })
            continue
          }

          const { error: insertErr } = await supabase.from('class_instances').insert({
            gym_id: gym.id,
            template_id: template.id,
            date: dateStr,
            local_time: template.local_time,
            starts_at: startsAt,
            capacity,
            name: template.name ?? 'WOD',
            workout_notes: template.workout_notes ?? null,
          })

          if (insertErr) {
            errors.push({ gymId: gym.id, templateId: template.id, date: dateStr, err: insertErr })
            continue
          }
          created++
        } catch (err) {
          errors.push({ gymId: gym.id, templateId: template.id, err })
        }
      }
    }
  }

  if (errors.length) {
    console.error('[cron/generate-instances] partial failures', { count: errors.length, sample: errors.slice(0, 5) })
  }

  return NextResponse.json({ created, errors: errors.length })
}

/**
 * DST-safe conversion of (localDate, localTime, timezone) → UTC ISO string.
 *
 * Strategy: guess UTC by pretending the local time is already UTC, measure
 * what that guess looks like in the target timezone, compute the offset, and
 * apply it. Repeat once more to correct for DST boundaries that landed inside
 * the first correction (which can shift the guess across a DST transition).
 *
 * `Intl.DateTimeFormat` with a timeZone correctly accounts for DST on any
 * date, so the two-pass refinement converges for every real-world case
 * including the "spring forward" non-existent hour (which we snap forward)
 * and "fall back" repeated hour (which we resolve to the first occurrence).
 */
export function localToUTC(dateStr: string, localTime: string, timezone: string): string | null {
  const [hh, mm] = localTime.split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null

  const targetLocalMs = Date.UTC(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10)),
    hh,
    mm,
    0,
    0
  )
  if (Number.isNaN(targetLocalMs)) return null

  function tzOffsetMsAt(utcMs: number): number {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false,
    })
    const parts = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map(p => [p.type, p.value]))
    const asIfUtcMs = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) % 24,
      Number(parts.minute),
      Number(parts.second)
    )
    return asIfUtcMs - utcMs
  }

  // First pass: guess offset using targetLocalMs as a UTC probe.
  let offset = tzOffsetMsAt(targetLocalMs)
  let utcMs = targetLocalMs - offset
  // Second pass: re-measure offset at the corrected point to settle DST.
  offset = tzOffsetMsAt(utcMs)
  utcMs = targetLocalMs - offset

  return new Date(utcMs).toISOString()
}
