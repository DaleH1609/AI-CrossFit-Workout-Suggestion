'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'

interface MemberRow { id: string; email: string; name: string; created_at: string; revoked_at: string | null }
interface GymUserRow { gym_id: string }

function AttendanceDots({ count }: { count: number }) {
  const max = 10
  const filled = Math.min(count, max)
  return (
    <div className="flex items-center gap-0.5" title={`${count} classes this month`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i < filled ? 'bg-accent' : 'bg-border'}`} />
      ))}
      {count > max && <span className="text-[10px] text-secondary ml-1">+{count - max}</span>}
    </div>
  )
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({})
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState('')
  const supabase = createClient()
  const { toast } = useToast()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMembers() }, [])

  useEffect(() => {
    if (members.length === 0) return
    let cancelled = false
    fetch('/api/members/attendance')
      .then(async res => {
        if (!res.ok) throw new Error(`attendance fetch returned ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (cancelled) return
        if (data.attendance) setAttendanceCounts(data.attendance as Record<string, number>)
      })
      .catch(err => {
        // Attendance is a nice-to-have; we don't toast on failure, but we do log.
        console.error('[members] attendance fetch failed', err)
      })
    return () => { cancelled = true }
  }, [members])

  async function loadMembers() {
    try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
    const gymUser = userData as unknown as GymUserRow | null
    const { data } = await supabase.from('users').select('id, email, name, created_at, revoked_at')
      .eq('gym_id', gymUser!.gym_id).eq('role', 'member').order('created_at')
    setMembers((data ?? []) as unknown as MemberRow[])
    } catch (err) {
      console.error('[members] loadMembers failed', err)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    setInviting(true)
    const res = await fetch('/api/members/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) })
    const data = await res.json()
    setInviting(false)
    if (!res.ok) { setInviteError(data.error ?? 'Failed to send invite'); return }
    setInviteEmail('')
    await loadMembers()
  }

  async function handleRevoke() {
    try {
      const res = await fetch('/api/members/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: revokeTarget }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Failed to revoke access', 'error')
        return
      }
      toast('Access revoked', 'success')
    } catch (err) {
      console.error('[members] revoke failed', err)
      toast('Network error — could not revoke access', 'error')
    } finally {
      setRevokeTarget(null)
      await loadMembers()
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch('/api/members/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: deleteTarget }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Failed to delete member', 'error')
        return
      }
      toast('Member deleted', 'success')
    } catch (err) {
      console.error('[members] delete failed', err)
      toast('Network error — could not delete member', 'error')
    } finally {
      setDeleteTarget(null)
      await loadMembers()
    }
  }

  async function handleRestore(memberId: string) {
    try {
      const res = await fetch('/api/members/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Failed to restore access', 'error')
        return
      }
      toast('Access restored', 'success')
    } catch (err) {
      console.error('[members] restore failed', err)
      toast('Network error — could not restore access', 'error')
    } finally {
      await loadMembers()
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground mb-6">Members</h1>

      {/* Inline invite bar */}
      <form onSubmit={handleInvite} className="flex gap-2 mb-8">
        <input
          type="email"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          placeholder="member@email.com"
          required
          className="flex-1 px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={inviting}
          className="px-4 py-2.5 bg-accent text-background text-sm font-bold tracking-wider rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50 whitespace-nowrap active:scale-[0.98]"
        >
          {inviting ? 'Sending…' : 'Send Invite →'}
        </button>
      </form>
      {inviteError && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-danger/20 bg-danger/5 text-sm text-danger">
          {inviteError}
        </div>
      )}

      {/* Member table */}
      {members.length === 0 ? (
        <div className="border border-border rounded-xl py-16 text-center">
          <p className="text-secondary text-sm">No members yet — invite someone above.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_140px_90px_80px] px-5 py-2.5 border-b border-border bg-surface-raised">
            <span className="text-[10px] text-secondary uppercase tracking-widest">Member</span>
            <span className="text-[10px] text-secondary uppercase tracking-widest">Classes this month</span>
            <span className="text-[10px] text-secondary uppercase tracking-widest">Status</span>
            <span />
          </div>

          {/* Rows */}
          {members.map(m => (
            <div key={m.id}
              className="group grid grid-cols-[1fr_140px_90px_80px] items-center px-5 py-3.5 border-b border-border last:border-0 hover:bg-surface-raised transition-colors">

              <div className="min-w-0 pr-4">
                <p className="text-sm text-foreground truncate">{m.email}</p>
                {m.name && <p className="text-xs text-secondary mt-0.5 truncate">{m.name}</p>}
              </div>

              <div>
                <AttendanceDots count={attendanceCounts[m.id] ?? 0} />
              </div>

              <div>
                {m.revoked_at ? (
                  <span className="text-xs text-danger">Revoked</span>
                ) : (
                  <span className="text-xs text-accent bg-accent-5 border border-accent-20 px-2 py-0.5 rounded-full">Active</span>
                )}
              </div>

              {/* Actions — visible on hover */}
              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {m.revoked_at ? (
                  <button
                    onClick={() => handleRestore(m.id)}
                    className="text-xs text-secondary hover:text-foreground transition-colors"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    onClick={() => setRevokeTarget(m.id)}
                    className="text-xs text-secondary hover:text-danger transition-colors"
                  >
                    Revoke
                  </button>
                )}
                <button
                  onClick={() => setDeleteTarget(m.id)}
                  className="text-xs text-danger/60 hover:text-danger transition-colors"
                  title="Delete member"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
