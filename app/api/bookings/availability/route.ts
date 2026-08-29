import { requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

/**
 * Month availability for the booking calendar.
 *
 * The existing GET /api/schedule/instances is owner-only and single-date, so a
 * member-facing month view needs its own endpoint rather than loosening that
 * one's auth.
 *
 * Returns every class instance in the month with its booked count and whether
 * the caller already holds a booking, so the calendar can disable full days
 * and mark booked slots without a request per day.
 */
export async function GET(req: Request) {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, user, userData } = auth

  const month = new URL(req.url).searchParams.get('month') // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return jsonError('month required as YYYY-MM')
  }

  const [y, m] = month.split('-').map(Number)
  const first = `${month}-01`
  // Day 0 of the next month is the last day of this one, and handles leap years.
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)

  const { data: instances, error } = await supabase
    .from('class_instances')
    .select('id, date, local_time, starts_at, capacity, name')
    .eq('gym_id', userData.gym_id)
    .gte('date', first)
    .lte('date', last)
    .order('starts_at')

  if (error) return jsonServerError('bookings/availability instances', error)
  if (!instances?.length) return jsonOk({ instances: [] })

  const ids = instances.map((i) => i.id)

  // One query for counts and one for this member's bookings, rather than a
  // query per instance.
  const [{ data: booked, error: bErr }, { data: mine, error: mErr }] = await Promise.all([
    supabase
      .from('bookings')
      .select('instance_id, status')
      .in('instance_id', ids)
      .in('status', ['confirmed', 'pending_confirmation']),
    supabase
      .from('bookings')
      .select('instance_id, status')
      .in('instance_id', ids)
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'pending_confirmation', 'waitlisted']),
  ])

  if (bErr) return jsonServerError('bookings/availability counts', bErr)
  if (mErr) return jsonServerError('bookings/availability mine', mErr)

  const counts = new Map<string, number>()
  for (const b of booked ?? []) counts.set(b.instance_id, (counts.get(b.instance_id) ?? 0) + 1)
  const mineBy = new Map((mine ?? []).map((b) => [b.instance_id, b.status]))

  return jsonOk({
    instances: instances.map((i) => ({
      id: i.id,
      date: i.date,
      localTime: i.local_time,
      startsAt: i.starts_at,
      name: i.name,
      capacity: i.capacity,
      booked: counts.get(i.id) ?? 0,
      myStatus: mineBy.get(i.id) ?? null,
    })),
  })
}
