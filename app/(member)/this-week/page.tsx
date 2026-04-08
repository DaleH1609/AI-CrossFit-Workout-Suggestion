export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { WorkoutCard } from '@/components/workout/workout-card'
import { ClassSlot } from '@/components/booking/class-slot'
import type { WorkoutDay } from '@/lib/types'

interface UserRow { gym_id: string; id: string }
interface WeekData { workouts: WorkoutDay[] }
interface ClassInstance { id: string; date: string; local_time: string; starts_at: string; capacity: number; name?: string; workout_notes?: string | null }
interface BookingRow { id: string; instance_id: string; status: string }

function getMondayOfCurrentWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default async function ThisWeekPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userDataRaw } = await supabase.from('users').select('gym_id, id').eq('id', user.id).single()
  const userData = userDataRaw as unknown as UserRow | null
  if (!userData) return <div className="text-secondary p-8">Account setup incomplete. Please contact your gym owner.</div>

  const weekStart = getMondayOfCurrentWeek()

  const { data: weekData } = await supabase.from('workout_weeks').select('workouts')
    .eq('gym_id', userData.gym_id).eq('status', 'published').is('archived_at', null)
    .eq('week_start', weekStart).maybeSingle()

  const workouts: WorkoutDay[] = (weekData as unknown as WeekData | null)?.workouts ?? []

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const { data: instancesRaw } = await supabase.from('class_instances').select('*')
    .eq('gym_id', userData.gym_id)
    .gte('date', weekStart).lte('date', weekEnd.toISOString().split('T')[0])
    .order('date').order('local_time')
  const now = new Date()
  const instances = ((instancesRaw ?? []) as unknown as ClassInstance[])
    .filter(i => new Date(i.starts_at) > now)

  const instanceIds = instances.map(i => i.id)
  const { data: userBookingsRaw } = instanceIds.length > 0
    ? await supabase.from('bookings').select('*').eq('user_id', user.id).in('instance_id', instanceIds)
    : { data: [] }
  const userBookings = (userBookingsRaw ?? []) as unknown as BookingRow[]

  const { data: allBookingsRaw } = instanceIds.length > 0
    ? await supabase.from('bookings').select('instance_id, status')
        .in('instance_id', instanceIds).in('status', ['confirmed', 'pending_confirmation'])
    : { data: [] }
  const allBookings = (allBookingsRaw ?? []) as unknown as BookingRow[]

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
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {DAY_NAMES.map((dayName, i) => {
            const workout = workouts.find(w => w.day === dayName)
            const dayDate = new Date(weekStart)
            dayDate.setDate(dayDate.getDate() + i)
            const dateStr = dayDate.toISOString().split('T')[0]
            const dayInstances = instances.filter(inst => inst.date === dateStr)

            const isToday = dateStr === new Date().toISOString().split('T')[0]

            return (
              <div key={dayName} className="flex flex-col gap-3">
                <div className="flex items-baseline gap-2">
                  <span className={`font-display text-sm font-semibold uppercase tracking-wider ${isToday ? 'text-accent' : 'text-white'}`}>{dayName}</span>
                  <span className="text-secondary text-xs">{dayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  {isToday && <span className="text-xs text-accent font-medium">Today</span>}
                </div>
                {workout && <WorkoutCard day={workout} />}
                {dayInstances.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {dayInstances.map((inst) => (
                      <ClassSlot
                        key={inst.id}
                        instance={inst}
                        confirmedCount={bookingCounts[inst.id] ?? 0}
                        userBooking={userBookings.find(b => b.instance_id === inst.id) ?? null}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
