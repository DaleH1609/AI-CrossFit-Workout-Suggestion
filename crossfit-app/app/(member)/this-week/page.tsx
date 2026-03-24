import { createClient } from '@/lib/supabase/server'
import { WorkoutCard } from '@/components/workout/workout-card'
import { ClassSlot } from '@/components/booking/class-slot'
import { Card } from '@/components/ui/card'
import type { WorkoutDay } from '@/lib/types'

function getMondayOfCurrentWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default async function ThisWeekPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userDataRaw } = await supabase.from('users').select('gym_id, id').eq('id', user.id).single()
  const userData = userDataRaw as any
  const weekStart = getMondayOfCurrentWeek()

  const { data: weekData } = await supabase.from('workout_weeks').select('workouts')
    .eq('gym_id', userData!.gym_id).eq('status', 'published').is('archived_at', null)
    .eq('week_start', weekStart).maybeSingle()

  const workouts: WorkoutDay[] = (weekData as any)?.workouts ?? []

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 4)
  const { data: instancesRaw } = await supabase.from('class_instances').select('*')
    .eq('gym_id', userData!.gym_id)
    .gte('date', weekStart).lte('date', weekEnd.toISOString().split('T')[0])
    .order('date').order('local_time')
  const instances = (instancesRaw ?? []) as any[]

  const instanceIds = instances.map(i => i.id)
  const { data: userBookingsRaw } = instanceIds.length > 0
    ? await supabase.from('bookings').select('*').eq('user_id', user.id).in('instance_id', instanceIds)
    : { data: [] }
  const userBookings = (userBookingsRaw ?? []) as any[]

  const { data: allBookingsRaw } = instanceIds.length > 0
    ? await supabase.from('bookings').select('instance_id, status')
        .in('instance_id', instanceIds).in('status', ['confirmed', 'pending_confirmation'])
    : { data: [] }
  const allBookings = (allBookingsRaw ?? []) as any[]

  const bookingCounts: Record<string, number> = {}
  for (const b of allBookings) {
    bookingCounts[b.instance_id] = (bookingCounts[b.instance_id] ?? 0) + 1
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">This Week</h1>
      {workouts.length === 0 ? (
        <p className="text-secondary">No workouts published yet for this week.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {DAY_NAMES.map((dayName, i) => {
            const workout = workouts.find(w => w.day === dayName)
            const dayDate = new Date(weekStart)
            dayDate.setDate(dayDate.getDate() + i)
            const dateStr = dayDate.toISOString().split('T')[0]
            const dayInstances = instances.filter(inst => inst.date === dateStr)

            return (
              <div key={dayName} className="flex flex-col gap-3">
                {workout && <WorkoutCard day={workout} />}
                {dayInstances.length > 0 && (
                  <Card>
                    <p className="text-secondary text-xs uppercase tracking-wider mb-2">Classes</p>
                    {dayInstances.map((inst: any) => (
                      <ClassSlot
                        key={inst.id}
                        instance={inst}
                        confirmedCount={bookingCounts[inst.id] ?? 0}
                        userBooking={userBookings.find(b => b.instance_id === inst.id) ?? null}
                      />
                    ))}
                  </Card>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
