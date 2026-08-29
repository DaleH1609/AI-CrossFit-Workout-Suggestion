// app/(admin)/gyms/page.tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminAuth } from '@/lib/auth-helpers'
import { GymSearchClient } from './gym-search-client'

async function getAllGyms() {
  const db = createAdminClient()

  // Fetch gyms (cap 500)
  const { data: gyms } = await db
    .from('gyms')
    .select('id, name, gym_type, created_at, suspended_at, owner_id')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!gyms?.length) return []

  const gymIds = gyms.map(g => g.id)
  const ownerIds = gyms.map(g => g.owner_id).filter(Boolean) as string[]

  // Fetch owner emails, member counts, booking counts, last booking — all in parallel
  const [{ data: owners }, { data: members }, { data: bookings }] = await Promise.all([
    db.from('users').select('id, email').in('id', ownerIds),
    db.from('users').select('gym_id').in('gym_id', gymIds).eq('role', 'member'),
    db.from('bookings').select('gym_id, created_at').in('gym_id', gymIds),
  ])

  const ownerMap = Object.fromEntries((owners ?? []).map(o => [o.id, o.email]))

  const memberCounts = (members ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.gym_id] = (acc[m.gym_id] ?? 0) + 1
    return acc
  }, {})

  const bookingData = (bookings ?? []).reduce<Record<string, { count: number; lastAt: string | null }>>((acc, b) => {
    if (!acc[b.gym_id]) acc[b.gym_id] = { count: 0, lastAt: null }
    acc[b.gym_id].count++
    if (!acc[b.gym_id].lastAt || b.created_at > acc[b.gym_id].lastAt!) {
      acc[b.gym_id].lastAt = b.created_at
    }
    return acc
  }, {})

  return gyms.map(g => ({
    id: g.id,
    name: g.name,
    gymType: g.gym_type,
    ownerEmail: g.owner_id ? (ownerMap[g.owner_id] ?? '-') : '-',
    memberCount: memberCounts[g.id] ?? 0,
    bookingCount: bookingData[g.id]?.count ?? 0,
    lastActive: bookingData[g.id]?.lastAt ?? g.created_at, // spec: fallback to gyms.created_at if no bookings
    createdAt: g.created_at,
    suspended: g.suspended_at !== null,
  }))
}

export default async function AdminGymsPage() {
  await requireAdminAuth()
  const gyms = await getAllGyms()
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">All gyms</h1>
        <p className="text-secondary text-sm mt-1">
          {gyms.length} gym{gyms.length !== 1 ? 's' : ''} on the platform
        </p>
      </div>
      <GymSearchClient gyms={gyms} />
    </div>
  )
}
