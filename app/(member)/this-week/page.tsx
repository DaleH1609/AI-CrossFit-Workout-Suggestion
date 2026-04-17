export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { WeekDayView } from '@/components/booking/week-day-view'
import type { WorkoutDay } from '@/lib/types'

interface UserRow { gym_id: string; id: string }
interface WeekData { workouts: WorkoutDay[] }
interface ClassInstance { id: string; date: string; local_time: string; starts_at: string; capacity: number; name?: string | null }
interface BookingRow { id: string; instance_id: string; status: string }
interface BookingWithUser { instance_id: string; status: string; users: { name: string } | null }

function getMondayOfCurrentWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

export default async function ThisWeekPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userDataRaw } = await supabase.from('users').select('gym_id, id').eq('id', user.id).single()
  const userData = userDataRaw as unknown as UserRow | null
  if (!userData) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-accent-10 border border-accent-20 flex items-center justify-center mb-4">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-accent">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-foreground font-medium mb-1">Account setup incomplete</p>
      <p className="text-secondary text-sm">Please contact your gym owner.</p>
    </div>
  )

  const weekStart = getMondayOfCurrentWeek()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const [{ data: weekData }, { data: instancesRaw }, { data: gymRaw }] = await Promise.all([
    supabase.from('workout_weeks').select('workouts')
      .eq('gym_id', userData.gym_id).eq('status', 'published').is('archived_at', null)
      .eq('week_start', weekStart).maybeSingle(),
    supabase.from('class_instances').select('*')
      .eq('gym_id', userData.gym_id)
      .gte('date', weekStart).lte('date', weekEnd.toISOString().split('T')[0])
      .order('date').order('local_time'),
    supabase.from('gyms').select('show_member_names, waitlist_enabled').eq('id', userData.gym_id).single(),
  ])

  const workouts: WorkoutDay[] = (weekData as unknown as WeekData | null)?.workouts ?? []
  const gym = gymRaw as unknown as { show_member_names: boolean; waitlist_enabled: boolean } | null
  const showMemberNames = gym?.show_member_names ?? false
  const waitlistEnabled = gym?.waitlist_enabled ?? true

  const now = new Date()
  const instances = ((instancesRaw ?? []) as unknown as ClassInstance[])
    .filter(i => new Date(i.starts_at) > now)

  const instanceIds = instances.map(i => i.id)

  const [{ data: userBookingsRaw }, { data: allBookingsRaw }] = await Promise.all([
    instanceIds.length > 0
      ? supabase.from('bookings').select('*').eq('user_id', user.id).in('instance_id', instanceIds)
      : Promise.resolve({ data: [] }),
    instanceIds.length > 0
      ? supabase.from('bookings')
          .select(showMemberNames ? 'instance_id, status, users(name)' : 'instance_id, status')
          .in('instance_id', instanceIds).in('status', ['confirmed', 'pending_confirmation'])
      : Promise.resolve({ data: [] }),
  ])

  const userBookings = (userBookingsRaw ?? []) as unknown as BookingRow[]

  const bookingCounts: Record<string, number> = {}
  const memberNames: Record<string, string[]> = {}

  for (const b of ((allBookingsRaw ?? []) as unknown as (BookingRow | BookingWithUser)[])) {
    bookingCounts[b.instance_id] = (bookingCounts[b.instance_id] ?? 0) + 1
    if (showMemberNames) {
      const bWithUser = b as BookingWithUser
      const name = bWithUser.users?.name
      if (name) {
        if (!memberNames[b.instance_id]) memberNames[b.instance_id] = []
        memberNames[b.instance_id].push(name)
      }
    }
  }

  const weekEndFormatted = new Date(weekStart)
  weekEndFormatted.setDate(weekEndFormatted.getDate() + 6)
  const weekLabel = `${new Date(weekStart + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${weekEndFormatted.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`

  return (
    <div>
      <p className="text-secondary text-sm mb-6 font-medium">{weekLabel}</p>
      {workouts.length === 0 && instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-10 border border-accent-20 flex items-center justify-center mb-4">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <p className="text-foreground font-medium mb-1">No program published yet</p>
          <p className="text-secondary text-sm">Your gym hasn&apos;t published workouts for this week.</p>
        </div>
      ) : (
        <WeekDayView
          weekStart={weekStart}
          workouts={workouts}
          instances={instances}
          userBookings={userBookings}
          bookingCounts={bookingCounts}
          memberNames={showMemberNames ? memberNames : undefined}
          waitlistEnabled={waitlistEnabled}
        />
      )}
    </div>
  )
}
