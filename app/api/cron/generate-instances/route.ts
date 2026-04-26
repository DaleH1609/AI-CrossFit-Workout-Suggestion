import { localToUTC } from '@/lib/utils/local-to-utc'
import { jsonOk, jsonServerError } from '@/lib/api/response'
import { assertCronAuth } from '@/lib/api/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const reject = assertCronAuth(req)
  if (reject) return reject

  const supabase = createAdminClient()

  const { data: gyms, error: gymsErr } = await supabase.from('gyms').select('id, timezone')
  if (gymsErr) return jsonServerError('cron/generate-instances gyms.select', gymsErr)
  if (!gyms?.length) return jsonOk({ created: 0, errors: [] })

  let created = 0
  const errors: Array<{ gymId: string; templateId?: string; date?: string; err: unknown }> = []

  for (const gym of gyms) {
    const timezone = gym.timezone ?? 'UTC'

    const [{ data: templates }, { data: defaults }] = await Promise.all([
      supabase.from('class_slot_templates').select('*').eq('gym_id', gym.id).eq('active', true),
      supabase.from('gym_schedule_defaults').select('day_of_week, default_capacity').eq('gym_id', gym.id).returns<{ day_of_week: number | null; default_capacity: number }[]>(),
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

  return jsonOk({ created, errors: errors.length })
}
