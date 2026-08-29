// app/(admin)/gyms/[gymId]/member-accordion-client.tsx
'use client'
import { useState } from 'react'

type Booking = {
  id: string
  className: string
  date: string
  status: string
}

type Member = {
  id: string
  name: string
  email: string
  role: string
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

function MemberRow({ member }: { member: Member }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr
        className="hover:bg-surface-raised transition-colors cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <td className="px-4 py-3 font-medium">
          {member.name || '-'}
          {member.revoked && (
            <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">revoked</span>
          )}
        </td>
        <td className="px-4 py-3 text-secondary text-xs">{member.email}</td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${member.role === 'owner' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
            {member.role}
          </span>
        </td>
        <td className="px-4 py-3 text-secondary text-xs">{new Date(member.joinedAt).toLocaleDateString()}</td>
        <td className="px-4 py-3 text-secondary text-xs">{open ? '▲' : '▼'}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="px-4 pb-3 bg-surface">
            <div className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Last 5 Bookings</div>
            {member.recentBookings.length === 0 ? (
              <p className="text-xs text-secondary">No bookings yet</p>
            ) : (
              <table className="w-full text-xs">
                <tbody className="divide-y divide-border">
                  {member.recentBookings.map(b => (
                    <tr key={b.id}>
                      <td className="py-1 pr-4 font-medium">{b.className}</td>
                      <td className="py-1 pr-4 text-secondary">{new Date(b.date).toLocaleDateString()}</td>
                      <td className="py-1">
                        <span className={`px-1.5 py-0.5 rounded capitalize ${STATUS_BADGE[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {b.status.replace('_', ' ')}
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

export function MemberAccordionClient({ members }: { members: Member[] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Members ({members.length})</h2>
        <p className="text-xs text-secondary mt-0.5">Click any row to expand booking history</p>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-secondary uppercase tracking-wide bg-surface">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Email</th>
            <th className="px-4 py-2 text-left font-medium">Role</th>
            <th className="px-4 py-2 text-left font-medium">Joined</th>
            <th className="px-4 py-2 text-left font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map(m => <MemberRow key={m.id} member={m} />)}
          {members.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-secondary text-sm">No members</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
