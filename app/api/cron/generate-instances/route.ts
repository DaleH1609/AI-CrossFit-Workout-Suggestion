import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Generates class instances from templates for the next 4 weeks for all gyms.
// Runs daily via cron; skips instances that already exist.

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: gyms } = await supabase.from('gyms').select('id, timezone')
  if (!gyms?.length) return NextResponse.json({ created: 0 })

  let created = 0

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
      // Generate instances for the next 4 weeks starting from today
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
        // Find the date of this template's day_of_week in the target week
        // day_of_week: 1=Mon, 2=Tue, ..., 7=Sun
        const base = new Date(today)
        base.setUTCDate(base.getUTCDate() + weekOffset * 7)

        // Align to Monday of this week
        const jsDay = base.getUTCDay() // 0=Sun, 1=Mon...6=Sat
        const isoDay = jsDay === 0 ? 7 : jsDay // 1=Mon...7=Sun
        const monday = new Date(base)
        monday.setUTCDate(base.getUTCDate() - (isoDay - 1))

        const targetDate = new Date(monday)
        targetDate.setUTCDate(monday.getUTCDate() + (template.day_of_week - 1))
        const dateStr = targetDate.toISOString().split('T')[0]

        // Skip past dates
        if (targetDate < today) continue

        // Skip if already exists
        const { data: existing } = await supabase
          .from('class_instances')
          .select('id')
          .eq('template_id', template.id)
          .eq('date', dateStr)
          .maybeSingle()

        if (existing) continue

        const localTime = (template.local_time as string).slice(0, 5) // 'HH:MM'
        const capacity = template.capacity ?? dayDefaults[template.day_of_week] ?? globalDefault

        await supabase.from('class_instances').insert({
          gym_id: gym.id,
          template_id: template.id,
          date: dateStr,
          local_time: template.local_time,
          starts_at: localToUTC(dateStr, localTime, timezone),
          capacity,
          name: template.name ?? 'WOD',
          workout_notes: template.workout_notes ?? null,
        })

        created++
      }
    }
  }

  return NextResponse.json({ created })
}

/** Convert a local date+time in a given IANA timezone to a UTC ISO string */
function localToUTC(dateStr: string, localTime: string, timezone: string): string {
  const [h, m] = localTime.split(':').map(Number)
  // Approximate UTC (as if timezone = UTC)
  const approx = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`)

  // Find what our approximation looks like in the target timezone
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric',
      hour12: false,
    }).formatToParts(approx).map(p => [p.type, p.value])
  )

  const tzH = parseInt(parts.hour) % 24
  const tzM = parseInt(parts.minute)

  // Offset needed to align approx to the desired local time
  let delta = (h * 60 + m) - (tzH * 60 + tzM)
  if (delta > 720) delta -= 1440
  if (delta < -720) delta += 1440

  return new Date(approx.getTime() + delta * 60000).toISOString()
}
