// app/(admin)/users/user-accordion-client.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'

type Booking = {
  id: string
  className: string
  date: string
  status: string
}

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  gymName: string
  gymId: string
  joinedAt: string
  revoked: boolean
  recentBookings: Booking[]
}

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  waitlisted: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-600',
  pending_confirmation: 'bg-blue-100 text-blue-800',
}

function UserRow({ user }: { user: UserRow }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr
        className="hover:bg-surface-raised transition-colors cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <td className="px-4 py-3 font-medium">{user.name || '—'}</td>
        <td className="px-4 py-3 text-secondary text-xs">{user.email}</td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'owner' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
            {user.role}
          </span>
          {user.revoked && (
            <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">revoked</span>
          )}
        </td>
        <td className="px-4 py-3 text-secondary text-xs">
          <Link href={`/admin/gyms/${user.gymId}`} onClick={e => e.stopPropagation()} className="text-accent hover:underline">
            {user.gymName}
          </Link>
        </td>
        <td className="px-4 py-3 text-secondary text-xs">{new Date(user.joinedAt).toLocaleDateString()}</td>
        <td className="px-4 py-3 text-secondary text-xs">{open ? '▲' : '▼'}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="px-4 pb-3 bg-surface">
            <div className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Last 10 Bookings</div>
            {user.recentBookings.length === 0 ? (
              <p className="text-xs text-secondary">No bookings yet</p>
            ) : (
              <table className="w-full text-xs">
                <tbody className="divide-y divide-border">
                  {user.recentBookings.map(b => (
                    <tr key={b.id}>
                      <td className="py-1 pr-4 font-medium">{b.className}</td>
                      <td className="py-1 pr-4 text-secondary">{new Date(b.date).toLocaleDateString()}</td>
                      <td className="py-1">
                        <span className={`px-1.5 py-0.5 rounded capitalize ${STATUS_BADGE[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {b.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export function UserAccordionClient({ users }: { users: UserRow[] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-xs text-secondary uppercase tracking-wide bg-surface">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Email</th>
            <th className="px-4 py-2 text-left font-medium">Role</th>
            <th className="px-4 py-2 text-left font-medium">Gym</th>
            <th className="px-4 py-2 text-left font-medium">Joined</th>
            <th className="px-4 py-2 text-left font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map(u => <UserRow key={u.id} user={u} />)}
          {users.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-secondary text-sm">No results</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
