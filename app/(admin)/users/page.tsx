// app/(admin)/users/page.tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminAuth } from '@/lib/auth-helpers'
import { UserAccordionClient } from './user-accordion-client'

async function searchUsers(q: string) {
  if (!q.trim()) return []

  const safeQ = q.replace(/%/g, '\\%').replace(/_/g, '\\_')

  const db = createAdminClient()

  const { data: users } = await db
    .from('users')
    .select('id, name, email, role, gym_id, created_at, revoked_at')
    .ilike('email', `%${safeQ}%`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!users?.length) return []

  // Filter out null gym_ids before passing to .in() — a null in the array produces a malformed query
  const gymIds = Array.from(new Set(users.map(u => u.gym_id).filter((id): id is string => id !== null)))
  const gymsResult = gymIds.length > 0
    ? await db.from('gyms').select('id, name').in('id', gymIds)
    : { data: [] as { id: string; name: string }[] }
  const { data: gyms } = gymsResult

  const gymMap = Object.fromEntries((gyms ?? []).map(g => [g.id, g.name]))

  // Last 10 bookings per user
  type BookingRow = {
    id: string
    user_id: string
    status: string
    created_at: string
    instance_id: string | null
    class_instances: { date: string; name: string } | null
  }

  const userIds = users.map(u => u.id)
  const { data: bookingsRaw } = await db
    .from('bookings')
    .select('id, user_id, status, created_at, instance_id, class_instances(date, name)')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(userIds.length * 10)

  const bookings = (bookingsRaw ?? []) as unknown as BookingRow[]

  const bookingsByUser: Record<string, BookingRow[]> = {}
  for (const b of bookings) {
    if (!bookingsByUser[b.user_id]) bookingsByUser[b.user_id] = []
    if (bookingsByUser[b.user_id].length < 10) bookingsByUser[b.user_id].push(b)
  }

  return users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    gymId: u.gym_id,
    gymName: gymMap[u.gym_id] ?? '—',
    joinedAt: u.created_at,
    revoked: u.revoked_at !== null,
    recentBookings: (bookingsByUser[u.id] ?? []).map(b => ({
      id: b.id,
      className: b.class_instances?.name ?? 'Class',
      date: b.class_instances?.date ?? b.created_at,
      status: b.status,
    })),
  }))
}

// Note: Next.js 14 — searchParams is sync. Next.js 15+ — searchParams is a Promise; if upgrading,
// change to: `searchParams: Promise<{ q?: string }>` and add `const { q: qParam } = await searchParams`.
export default async function AdminUsersPage(
  props: {
    searchParams: Promise<{ q?: string }>
  }
) {
  await requireAdminAuth()
  const searchParams = await props.searchParams;
  const q = searchParams.q?.trim() ?? ''
  const users = await searchUsers(q)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">User Lookup</h1>
        <p className="text-secondary text-sm mt-1">Search by email address. Read-only.</p>
      </div>

      <form method="get" className="flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by email…"
          className="w-full max-w-sm px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
          autoComplete="off"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-md bg-accent text-white hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </form>

      {q && (
        <div>
          <p className="text-sm text-secondary mb-3">
            {users.length === 0
              ? `No users found for "${q}"`
              : `${users.length} result${users.length !== 1 ? 's' : ''} for "${q}"`}
          </p>
          {users.length > 0 && <UserAccordionClient users={users} />}
        </div>
      )}
    </div>
  )
}
