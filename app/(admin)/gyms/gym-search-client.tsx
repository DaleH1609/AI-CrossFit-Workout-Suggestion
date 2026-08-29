// app/(admin)/gyms/gym-search-client.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type Gym = {
  id: string
  name: string
  gymType: string
  ownerEmail: string
  memberCount: number
  bookingCount: number
  lastActive: string   // fallback to createdAt if no bookings - never null
  createdAt: string
  suspended: boolean
}

const TYPE_BADGE: Record<string, string> = {
  crossfit: 'bg-blue-100 text-blue-800',
  hyrox: 'bg-yellow-100 text-yellow-800',
}

export function GymSearchClient({ gyms }: { gyms: Gym[] }) {
  const [query, setQuery] = useState('')
  const q = query.toLowerCase()
  const filtered = q
    ? gyms.filter(g => g.name.toLowerCase().includes(q) || g.ownerEmail.toLowerCase().includes(q))
    : gyms

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search by gym name or owner email…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full max-w-sm px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-secondary uppercase tracking-wide bg-surface">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Gym</th>
              <th className="px-4 py-2 text-left font-medium">Owner</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Members</th>
              <th className="px-4 py-2 text-left font-medium">Bookings</th>
              <th className="px-4 py-2 text-left font-medium">Last Active</th>
              <th className="px-4 py-2 text-left font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(gym => (
              <tr key={gym.id} className="hover:bg-surface-raised transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/gyms/${gym.id}`} className="font-medium text-accent hover:underline">
                    {gym.name}
                  </Link>
                  {gym.suspended && (
                    <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">suspended</span>
                  )}
                </td>
                <td className="px-4 py-3 text-secondary text-xs">{gym.ownerEmail}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${TYPE_BADGE[gym.gymType] ?? 'bg-gray-100 text-gray-700'}`}>
                    {gym.gymType}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{gym.memberCount}</td>
                <td className="px-4 py-3 text-secondary">{gym.bookingCount}</td>
                <td className="px-4 py-3 text-secondary text-xs">
                  {formatDistanceToNow(new Date(gym.lastActive), { addSuffix: true })}
                </td>
                <td className="px-4 py-3 text-secondary text-xs">
                  {new Date(gym.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-secondary">No gyms match your search</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-secondary">
        Showing {filtered.length} of {gyms.length} gyms{gyms.length === 500 ? ' (capped at 500)' : ''}
      </p>
    </div>
  )
}
