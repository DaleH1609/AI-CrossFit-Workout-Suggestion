// app/whiteboard/[token]/page.tsx
// Public TV / whiteboard display for gym walls — no auth required
import { createAdminClient } from '@/lib/supabase/admin'
import { WhiteboardClient } from './whiteboard-client'
import { notFound } from 'next/navigation'
import type { WorkoutDay } from '@/lib/types'
import { generateCheckinCode } from '@/lib/checkin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ClassInstance {
  id: string
  date: string
  local_time: string
  starts_at: string
  capacity: number
  name?: string | null
}

interface BookingRow {
  user_id: string
  status: string
  attended: boolean | null
  users: { name: string } | null
}

function getTodayLocal(timezone: string): string {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: timezone })
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

function getMondayOfDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

export default async function WhiteboardPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params

  const admin = createAdminClient()

  const { data: gymRow } = await admin.from('gyms')
    .select('id, name, timezone')
    .eq('whiteboard_token', token)
    .maybeSingle()

  if (!gymRow) notFound()

  const gymId = (gymRow as unknown as { id: string; name: string; timezone: string }).id
  const gymName = (gymRow as unknown as { id: string; name: string; timezone: string }).name
  const timezone = (gymRow as unknown as { id: string; name: string; timezone: string }).timezone

  const today = getTodayLocal(timezone)
  const weekStart = getMondayOfDate(today)

  const [{ data: weekData }, { data: instancesRaw }] = await Promise.all([
    admin.from('workout_weeks')
      .select('workouts')
      .eq('gym_id', gymId)
      .eq('status', 'published')
      .is('archived_at', null)
      .eq('week_start', weekStart)
      .maybeSingle(),
    admin.from('class_instances')
      .select('id, date, local_time, starts_at, capacity, name')
      .eq('gym_id', gymId)
      .eq('date', today)
      .order('local_time'),
  ])

  const workouts: WorkoutDay[] = (weekData as unknown as { workouts: WorkoutDay[] } | null)?.workouts ?? []
  const instances = (instancesRaw ?? []) as unknown as ClassInstance[]

  const todayWorkout = workouts.find(w =>
    w.day === new Date(today + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
  ) ?? null

  // Fetch bookings for today's classes
  const instanceIds = instances.map(i => i.id)
  const { data: bookingsRaw } = instanceIds.length > 0
    ? await admin.from('bookings')
        .select('user_id, status, attended, users(name)')
        .in('instance_id', instanceIds)
        .in('status', ['confirmed', 'pending_confirmation'])
    : { data: [] }

  const bookings = (bookingsRaw ?? []) as unknown as (BookingRow & { instance_id: string })[]

  // Generate check-in codes for today's instances (server-side, uses BOOKING_TOKEN_SECRET)
  const checkinCodes: Record<string, string> = {}
  for (const inst of instances) {
    try { checkinCodes[inst.id] = generateCheckinCode(inst.id) } catch { /* skip if secret not configured */ }
  }

  return (
    <WhiteboardClient
      gymName={gymName}
      today={today}
      timezone={timezone}
      todayWorkout={todayWorkout}
      instances={instances}
      bookings={bookings}
      checkinCodes={checkinCodes}
    />
  )
}
