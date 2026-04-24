// app/(admin)/gyms/[gymId]/page.tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { MemberAccordionClient } from './member-accordion-client'
import { DangerZoneClient } from './danger-zone-client'
import Link from 'next/link'

function getWeekRange(timezone: string): { start: string; end: string } {
  const tz = timezone || 'UTC'
  // Get today's date string in the gym's timezone
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
  const today = new Date(todayStr + 'T00:00:00')
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysFromMon)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}

async function getGymDetail(gymId: string) {
  const db = createAdminClient()

  const { data: gym } = await db
    .from('gyms')
    .select('id, name, gym_type, timezone, created_at, owner_id, suspended_at')
    .eq('id', gymId)
    .single()

  if (!gym) return null

  const { start: weekStart, end: weekEnd } = getWeekRange(gym.timezone)

  // Fetch week instances first — weekBookings must be filtered by instance_id
  // (not created_at) to capture bookings made in advance for this week's classes.
  const { data: weekInstances } = await db
    .from('class_instances')
    .select('id, date, local_time, capacity, name')
    .eq('gym_id', gymId)
    .gte('date', weekStart)
    .lte('date', weekEnd)

  const weekInstanceIds = (weekInstances ?? []).map(i => i.id)

  const [
    { data: owner },
    { count: activeMembers },
    { count: revokedMembers },
    { count: totalBookings },
    { count: totalWeeks },
    { data: allMembers },
    { data: weekBookings },
    { data: upcomingInstances },
  ] = await Promise.all([
    db.from('users').select('email').eq('id', gym.owner_id ?? '').single(),
    db.from('users').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('role', 'member').is('revoked_at', null),
    db.from('users').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('role', 'member').not('revoked_at', 'is', null),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('gym_id', gymId),
    db.from('workout_weeks').select('id', { count: 'exact', head: true }).eq('gym_id', gymId),
    db.from('users').select('id, name, email, role, created_at, revoked_at').eq('gym_id', gymId).order('created_at'),
    // Filter by instance_id so we get bookings FOR this week's classes, not bookings MADE this week
    weekInstanceIds.length > 0
      ? db.from('bookings').select('instance_id, status').in('instance_id', weekInstanceIds)
      : Promise.resolve({ data: [] }),
    db.from('class_instances').select('id, date, local_time, capacity, name').eq('gym_id', gymId).gte('date', new Date().toISOString().split('T')[0]).lte('date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('date').order('local_time').limit(20),
  ])

  // Member booking histories (last 5 per member)
  const memberIds = (allMembers ?? []).map(m => m.id)
  type BookingRow = { id: string; user_id: string; status: string; created_at: string; instance_id: string; class_instances: { date: string; name: string } | null }
  const { data: recentBookings } = memberIds.length > 0
    ? await db
        .from('bookings')
        .select('id, user_id, status, created_at, instance_id, class_instances(date, name)')
        .in('user_id', memberIds)
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false })
        .limit(memberIds.length * 5)
    : { data: [] as BookingRow[] }

  // Group bookings by member (last 5 per member)
  const bookingsByMember: Record<string, BookingRow[]> = {}
  for (const b of (recentBookings ?? []) as BookingRow[]) {
    if (!bookingsByMember[b.user_id]) bookingsByMember[b.user_id] = []
    if (bookingsByMember[b.user_id].length < 5) bookingsByMember[b.user_id].push(b)
  }

  // Booking health calcs — weekBookings already scoped to weekInstanceIds
  const weekBookingList = weekBookings ?? []
  const confirmedThisWeek = weekBookingList.filter(b => b.status === 'confirmed').length
  const cancelledThisWeek = weekBookingList.filter(b => b.status === 'cancelled').length
  const totalThisWeek = weekBookingList.length
  const totalCapacityThisWeek = (weekInstances ?? []).reduce((sum, i) => sum + i.capacity, 0)
  const fillRate = totalCapacityThisWeek > 0
    ? Math.round((confirmedThisWeek / totalCapacityThisWeek) * 100)
    : null
  const cancellationRate = totalThisWeek > 0
    ? Math.round((cancelledThisWeek / totalThisWeek) * 100)
    : null

  // Upcoming instances with confirmed booking counts
  const upcomingIds = (upcomingInstances ?? []).map(i => i.id)
  const { data: upcomingBookings } = upcomingIds.length > 0
    ? await db.from('bookings').select('instance_id').in('instance_id', upcomingIds).eq('status', 'confirmed')
    : { data: [] }
  const upcomingConfirmedCounts = (upcomingBookings ?? []).reduce<Record<string, number>>((acc, b) => {
    acc[b.instance_id] = (acc[b.instance_id] ?? 0) + 1
    return acc
  }, {})

  return {
    gym,
    owner,
    activeMembers: activeMembers ?? 0,
    revokedMembers: revokedMembers ?? 0,
    totalBookings: totalBookings ?? 0,
    totalWeeks: totalWeeks ?? 0,
    members: (allMembers ?? []).map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      joinedAt: m.created_at,
      revoked: m.revoked_at !== null,
      recentBookings: (bookingsByMember[m.id] ?? []).map(b => ({
        id: b.id,
        className: b.class_instances?.name ?? 'Class',
        date: b.class_instances?.date ?? b.created_at,
        status: b.status,
      })),
    })),
    bookingHealth: {
      confirmedThisWeek,
      fillRate,
      cancellationRate,
    },
    upcomingInstances: (upcomingInstances ?? []).map(i => ({
      id: i.id,
      date: i.date,
      localTime: i.local_time,
      name: i.name,
      capacity: i.capacity,
      confirmed: upcomingConfirmedCounts[i.id] ?? 0,
    })),
  }
}

export default async function GymDetailPage({ params }: { params: { gymId: string } }) {
  const data = await getGymDetail(params.gymId)
  if (!data) notFound()

  const { gym, owner, activeMembers, revokedMembers, totalBookings, totalWeeks, members, bookingHealth, upcomingInstances } = data

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Back link */}
      <Link href="/admin/gyms" className="text-sm text-accent hover:underline">← All Gyms</Link>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">{gym.name}</h1>
        {gym.suspended_at && (
          <span className="inline-block mt-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
            Suspended {new Date(gym.suspended_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* 1. Gym Info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Owner', value: owner?.email ?? '—' },
          { label: 'Type', value: gym.gym_type },
          { label: 'Timezone', value: gym.timezone },
          { label: 'Members', value: `${activeMembers} active · ${revokedMembers} revoked` },
          { label: 'Total Bookings', value: totalBookings.toLocaleString() },
          { label: 'Workout Weeks', value: `${totalWeeks} generated` },
        ].map(({ label, value }) => (
          <div key={label} className="p-4 rounded-lg border border-border bg-surface">
            <p className="text-xs text-secondary uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-foreground mt-1 capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* 2. Booking Health */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Booking Health (This Week)</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-border bg-surface">
            <p className="text-xs text-secondary uppercase tracking-wide">Confirmed Bookings</p>
            <p className="text-2xl font-bold text-foreground mt-1">{bookingHealth.confirmedThisWeek}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-surface">
            <p className="text-xs text-secondary uppercase tracking-wide">Avg Fill Rate</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {bookingHealth.fillRate !== null ? `${bookingHealth.fillRate}%` : '—'}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-surface">
            <p className="text-xs text-secondary uppercase tracking-wide">Cancellation Rate</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {bookingHealth.cancellationRate !== null ? `${bookingHealth.cancellationRate}%` : '—'}
            </p>
          </div>
        </div>

        {/* Upcoming instances */}
        <h3 className="text-sm font-semibold text-foreground mt-4">Upcoming Classes (Next 7 Days)</h3>
        {upcomingInstances.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            ⚠ No upcoming class instances. Check schedule templates and cron.
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs text-secondary uppercase tracking-wide bg-surface">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Time</th>
                  <th className="px-4 py-2 text-left font-medium">Class</th>
                  <th className="px-4 py-2 text-left font-medium">Booked / Cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcomingInstances.map(i => (
                  <tr key={i.id}>
                    <td className="px-4 py-2 text-secondary text-xs">{i.date}</td>
                    <td className="px-4 py-2 text-secondary text-xs">{i.localTime}</td>
                    <td className="px-4 py-2 font-medium">{i.name}</td>
                    <td className="px-4 py-2">
                      <span className={i.confirmed >= i.capacity ? 'text-red-600 font-semibold' : ''}>
                        {i.confirmed} / {i.capacity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Members */}
      <MemberAccordionClient members={members} />

      {/* 4. Danger Zone */}
      <DangerZoneClient gymId={gym.id} gymName={gym.name} isSuspended={gym.suspended_at !== null} />
    </div>
  )
}
