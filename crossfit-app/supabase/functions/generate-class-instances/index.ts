import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

/** Returns the Date of the next (or current) occurrence of isoWeekday (1=Mon…7=Sun) on or after fromDate */
function nextOccurrence(fromDate: Date, isoWeekday: number): Date {
  const result = new Date(fromDate)
  result.setHours(0, 0, 0, 0)
  // JS getDay(): 0=Sun,1=Mon…6=Sat → convert to ISO: Mon=1…Sun=7
  const jsDay = result.getDay() === 0 ? 7 : result.getDay()
  const diff = (isoWeekday - jsDay + 7) % 7
  result.setDate(result.getDate() + diff)
  return result
}

Deno.serve(async () => {
  const { data: gyms } = await supabase.from('gyms').select('id, timezone')

  for (const gym of gyms ?? []) {
    const { data: templates } = await supabase.from('class_slot_templates')
      .select('*').eq('gym_id', gym.id).eq('active', true)

    for (const template of templates ?? []) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const firstOccurrence = nextOccurrence(today, template.day_of_week)

      for (let weekOffset = 0; weekOffset <= 3; weekOffset++) {
        const targetDate = new Date(firstOccurrence)
        targetDate.setDate(targetDate.getDate() + weekOffset * 7)
        const dateStr = targetDate.toISOString().split('T')[0]

        const { data: existing } = await supabase.from('class_instances')
          .select('id').eq('template_id', template.id).eq('date', dateStr).maybeSingle()
        if (existing) continue

        const startsAt = new Date(`${dateStr}T${template.local_time}:00`)

        await supabase.from('class_instances').insert({
          gym_id: gym.id,
          template_id: template.id,
          date: dateStr,
          local_time: template.local_time,
          starts_at: startsAt.toISOString(),
          capacity: template.capacity,
        })
      }
    }
  }

  return new Response('Done', { status: 200 })
})
