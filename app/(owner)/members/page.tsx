'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Card } from '@/components/ui/card'

interface MemberRow { id: string; email: string; name: string; created_at: string; revoked_at: string | null }
interface GymUserRow { gym_id: string }

export default function MembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({})
  const [inviteEmail, setInviteEmail] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState('')
  const supabase = createClient()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMembers() }, [])

  useEffect(() => {
    if (members.length === 0) return
    fetch('/api/members/attendance')
      .then(res => res.json())
      .then(data => {
        if (data.attendance) setAttendanceCounts(data.attendance as Record<string, number>)
      })
      .catch(() => {/* silently ignore attendance fetch errors */})
  }, [members])

  async function loadMembers() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
    const gymUser = userData as unknown as GymUserRow | null
    const { data } = await supabase.from('users').select('id, email, name, created_at, revoked_at')
      .eq('gym_id', gymUser!.gym_id).eq('role', 'member').order('created_at')
    setMembers((data ?? []) as unknown as MemberRow[])
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    const res = await fetch('/api/members/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) })
    const data = await res.json()
    if (!res.ok) { setInviteError(data.error ?? 'Failed to send invite'); return }
    setInviteEmail('')
    await loadMembers()
  }

  async function handleRevoke() {
    await fetch('/api/members/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: revokeTarget }) })
    setRevokeTarget(null)
    await loadMembers()
  }

  async function handleDelete() {
    await fetch('/api/members/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: deleteTarget }) })
    setDeleteTarget(null)
    await loadMembers()
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground mb-6">Members</h1>
      <Card className="mb-6">
        <h2 className="text-foreground font-semibold mb-3">Invite Member</h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            placeholder="member@email.com" required
            className="flex-1 px-3 py-2 bg-background border border-border rounded-btn text-foreground placeholder-secondary focus:outline-none focus:border-accent"
          />
          <Button type="submit">Send Invite</Button>
        </form>
        {inviteError && <p className="text-danger text-xs mt-2">{inviteError}</p>}
      </Card>

      <div className="space-y-2">
        {members.map(m => (
          <Card key={m.id} className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm">{m.email}</p>
              <p className="text-zinc-400 text-xs">{attendanceCounts[m.id] ?? 0} classes this month</p>
              {m.revoked_at && <p className="text-danger text-xs">Revoked</p>}
            </div>
            <div className="flex items-center gap-2">
              {m.revoked_at ? (
                <Button onClick={async () => {
                  await fetch('/api/members/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: m.id }) })
                  await loadMembers()
                }}>Restore</Button>
              ) : (
                <Button variant="danger" onClick={() => setRevokeTarget(m.id)}>Revoke</Button>
              )}
              <Button variant="danger" onClick={() => setDeleteTarget(m.id)}>Delete</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!revokeTarget}
        title="Revoke Member Access?"
        description="This will cancel all their future bookings and they will no longer be able to log in."
        confirmLabel="Revoke Access"
        confirmVariant="danger"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
      <Modal
        open={!!deleteTarget}
        title="Delete Member?"
        description="This will permanently delete the member and cancel all their future bookings. This cannot be undone."
        confirmLabel="Delete Member"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
