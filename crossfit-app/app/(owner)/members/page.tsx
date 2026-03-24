'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Card } from '@/components/ui/card'

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { loadMembers() }, [])

  async function loadMembers() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
    const { data } = await supabase.from('users').select('id, email, name, created_at, revoked_at')
      .eq('gym_id', (userData as any)!.gym_id).eq('role', 'member').order('created_at')
    setMembers(data ?? [])
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/members/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) })
    setInviteEmail('')
    await loadMembers()
  }

  async function handleRevoke() {
    await fetch('/api/members/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: revokeTarget }) })
    setRevokeTarget(null)
    await loadMembers()
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">Members</h1>
      <Card className="mb-6">
        <h2 className="text-white font-semibold mb-3">Invite Member</h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            placeholder="member@email.com" required
            className="flex-1 px-3 py-2 bg-background border border-accent-border rounded-btn text-white placeholder-secondary focus:outline-none focus:border-accent"
          />
          <Button type="submit">Send Invite</Button>
        </form>
      </Card>

      <div className="space-y-2">
        {members.map(m => (
          <Card key={m.id} className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">{m.email}</p>
              {m.revoked_at && <p className="text-danger text-xs">Revoked</p>}
            </div>
            {!m.revoked_at && (
              <Button variant="danger" onClick={() => setRevokeTarget(m.id)}>Revoke</Button>
            )}
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
    </div>
  )
}
