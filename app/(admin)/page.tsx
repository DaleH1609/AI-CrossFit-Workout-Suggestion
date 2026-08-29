// app/(admin)/page.tsx
export const revalidate = 60 // refresh stats every minute

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminAuth } from '@/lib/auth-helpers'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

async function getStats() {
  const db = createAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalGyms },
    { count: newGyms },
    { count: totalMembers },
    { count: newMembers },
    { count: totalBookings },
    { count: newBookings },
    { count: totalWeeks },
  ] = await Promise.all([
    db.from('gyms').select('id', { count: 'exact', head: true }),
    db.from('gyms').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'member'),
    db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'member').gte('created_at', sevenDaysAgo),
    db.from('bookings').select('id', { count: 'exact', head: true }),
    db.from('bookings').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    db.from('workout_weeks').select('id', { count: 'exact', head: true }),
  ])

  return { totalGyms, newGyms, totalMembers, newMembers, totalBookings, newBookings, totalWeeks }
}

async function getRecentGyms() {
  const db = createAdminClient()
  const { data: gyms } = await db
    .from('gyms')
    .select('id, name, gym_type, created_at, owner_id')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!gyms?.length) return []

  const ownerIds = gyms.map(g => g.owner_id).filter(Boolean) as string[]
  const gymIds = gyms.map(g => g.id)

  const [{ data: owners }, { data: members }] = await Promise.all([
    db.from('users').select('id, email').in('id', ownerIds),
    db.from('users').select('gym_id').in('gym_id', gymIds).eq('role', 'member'),
  ])

  const ownerMap = Object.fromEntries((owners ?? []).map(o => [o.id, o.email]))

  const memberCounts = (members ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.gym_id] = (acc[m.gym_id] ?? 0) + 1
    return acc
  }, {})

  return gyms.map(g => ({
    id: g.id,
    name: g.name,
    gymType: g.gym_type,
    createdAt: g.created_at,
    ownerEmail: g.owner_id ? ownerMap[g.owner_id] ?? '—' : '—',
    memberCount: memberCounts[g.id] ?? 0,
  }))
}

const TYPE_BADGE: Record<string, string> = {
  crossfit: 'bg-blue-100 text-blue-800',
  hyrox: 'bg-yellow-100 text-yellow-800',
}

export default async function AdminOverviewPage() {
  await requireAdminAuth()
  const [stats, recentGyms] = await Promise.all([getStats(), getRecentGyms()])

  const cards = [
    { label: 'Total Gyms',           value: stats.totalGyms ?? 0, delta: stats.newGyms ?? 0 },
    { label: 'Total Members',        value: stats.totalMembers ?? 0, delta: stats.newMembers ?? 0 },
    { label: 'Total Bookings',       value: stats.totalBookings ?? 0, delta: stats.newBookings ?? 0 },
    { label: 'Workout Weeks',        value: stats.totalWeeks ?? 0, delta: null },
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Platform overview</h1>
        <p className="text-secondary text-sm mt-1">All gyms, members, and activity across the platform.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="p-4 rounded-lg border border-border bg-surface">
            <p className="text-xs text-secondary uppercase tracking-wide">{card.label}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{card.value.toLocaleString()}</p>
            {card.delta !== null && (
              <p className="text-xs mt-1 text-emerald-600">↑ {card.delta} this week</p>
            )}
          </div>
        ))}
      </div>

      {/* Recently joined gyms */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recently joined gyms</h2>
          <Link href="/admin/gyms" className="text-xs text-accent hover:underline">View all →</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-secondary uppercase tracking-wide bg-surface">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Gym</th>
              <th className="px-4 py-2 text-left font-medium">Owner</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Members</th>
              <th className="px-4 py-2 text-left font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recentGyms.map(gym => (
              <tr key={gym.id} className="hover:bg-surface-raised transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/gyms/${gym.id}`} className="font-medium text-accent hover:underline">
                    {gym.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-secondary">{gym.ownerEmail}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${TYPE_BADGE[gym.gymType] ?? 'bg-gray-100 text-gray-700'}`}>
                    {gym.gymType}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{gym.memberCount}</td>
                <td className="px-4 py-3 text-secondary text-xs">
                  {formatDistanceToNow(new Date(gym.createdAt), { addSuffix: true })}
                </td>
              </tr>
            ))}
            {recentGyms.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-secondary text-sm">No gyms yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
