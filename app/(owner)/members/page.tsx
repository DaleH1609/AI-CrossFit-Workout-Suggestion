'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { MemberNotes } from '@/components/admin/member-notes'
import { MemberPasses } from '@/components/admin/member-passes'
import { MemberPauses } from '@/components/admin/member-pauses'
import { MemberScaling } from '@/components/admin/member-scaling'

interface MemberRow { id: string; email: string; name: string; created_at: string; revoked_at: string | null; role?: string; waiver_signed_at: string | null }
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
  const [notesMember, setNotesMember] = useState<MemberRow | null>(null)
  const [memberPanel, setMemberPanel] = useState<'notes' | 'passes' | 'pauses' | 'scaling'>('notes')
  const [tab, setTab] = useState<'members' | 'coaches'>('members')
  const [coaches, setCoaches] = useState<MemberRow[]>([])
  const [inviteError, setInviteError] = useState('')
  const [deletionRequests, setDeletionRequests] = useState<Array<{
    id: string; requested_at: string;
    users: { id: string; name: string | null; email: string } | null
  }>>([])
  const supabase = createClient()
  const { toast } = useToast()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMembers(); loadCoaches(); loadDeletionRequests() }, [])

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
    const { data } = await supabase.from('users').select('id, email, name, created_at, revoked_at, waiver_signed_at')
      .eq('gym_id', gymUser!.gym_id).eq('role', 'member').order('created_at')
    setMembers((data ?? []) as unknown as MemberRow[])
    } catch (err) {
      console.error('[members] loadMembers failed', err)
    }
  }

  async function loadDeletionRequests() {
    const res = await fetch('/api/admin/deletion-requests')
    if (res.ok) setDeletionRequests(await res.json() ?? [])
  }

  async function handleActionDeletion(requestId: string, memberId: string) {
    if (!confirm("Have you deleted this member's account? Mark request as actioned?")) return
    await fetch('/api/admin/deletion-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: requestId }),
    })
    await Promise.all([loadMembers(), loadDeletionRequests()])
  }

  async function loadCoaches() {
    try {
      const res = await fetch('/api/admin/coaches')
      if (!res.ok) return
      const data = await res.json()
      setCoaches((data ?? []) as MemberRow[])
    } catch (err) {
      console.error('[members] loadCoaches failed', err)
    }
  }

  async function handleRoleToggle(member: MemberRow, newRole: 'coach' | 'member') {
    const res = await fetch('/api/admin/coaches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: member.id, role: newRole }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast(data.error ?? 'Failed to update role', 'error')
      return
    }
    toast(newRole === 'coach' ? `${member.name || member.email} is now a coach` : `Role changed to member`, 'success')
    await Promise.all([loadMembers(), loadCoaches()])
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
      {deletionRequests.length > 0 && (
        <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-4 space-y-2">
          <p className="text-sm font-semibold text-danger">Pending Deletion Requests ({deletionRequests.length})</p>
          {deletionRequests.map(req => (
            <div key={req.id} className="flex items-center justify-between gap-4 text-xs text-secondary">
              <span>
                {req.users?.name ?? req.users?.email ?? '—'}
                {req.users?.name && req.users?.email && <span className="text-secondary/60 ml-1">({req.users.email})</span>}
                {' '}— requested {new Date(req.requested_at).toLocaleDateString('en-GB')}
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => req.users && handleActionDeletion(req.id, req.users.id)}
                  className="text-xs text-danger hover:underline"
                >
                  Mark actioned
                </button>
              </div>
            </div>
          ))}
          <p className="text-xs text-secondary/60 pt-1">Delete the member via the Members list, then mark each request as actioned.</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-foreground">Members</h1>
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {(['members', 'coaches'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-medium capitalize rounded transition-colors ${
                tab === t ? 'bg-accent text-background' : 'text-secondary hover:text-foreground'
              }`}>{t} {t === 'coaches' && coaches.length > 0 && `(${coaches.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Coaches tab */}
      {tab === 'coaches' && (
        <div className="space-y-4">
          {coaches.length === 0 ? (
            <div className="border border-border rounded-xl py-12 text-center">
              <p className="text-secondary text-sm">No coaches yet.</p>
              <p className="text-secondary text-xs mt-1">Promote a member to coach from the Members tab.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_120px] px-5 py-2.5 border-b border-border bg-surface-raised">
                <span className="text-[10px] text-secondary uppercase tracking-widest">Coach</span>
                <span />
              </div>
              {coaches.map(c => (
                <div key={c.id} className="group grid grid-cols-[1fr_120px] items-center px-5 py-3.5 border-b border-border last:border-0 hover:bg-surface-raised transition-colors">
                  <div>
                    <p className="text-sm text-foreground">{c.name || c.email}</p>
                    {c.name && <p className="text-xs text-secondary mt-0.5">{c.email}</p>}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleRoleToggle(c, 'member')}
                      className="text-xs text-secondary hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Demote
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'members' && <>
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
        <div className="border border-dashed border-border/60 rounded-xl py-16 px-8 text-center bg-surface/40">
          <div className="text-4xl mb-4">👥</div>
          <p className="text-foreground font-medium mb-1">No members yet</p>
          <p className="text-secondary text-sm">Enter an email address above and hit Invite to add your first member. They'll receive a sign-up link.</p>
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
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm text-foreground truncate">{m.email}</p>
                  {!m.waiver_signed_at && (
                    <span className="shrink-0 text-[9px] font-bold tracking-wider text-warning border border-warning/30 bg-warning/5 px-1.5 py-0.5 rounded-full uppercase">
                      No waiver
                    </span>
                  )}
                </div>
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
                <button
                  onClick={() => handleRoleToggle(m, 'coach')}
                  className="text-xs text-secondary hover:text-accent transition-colors"
                  title="Promote to coach"
                >
                  Coach
                </button>
                <button
                  onClick={() => setNotesMember(m)}
                  className="text-xs text-secondary hover:text-foreground transition-colors"
                  title="Coach notes"
                >
                  Notes
                </button>
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

      </>}

      {/* Member detail slide-over */}
      {notesMember && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNotesMember(null)} />
          <div className="relative w-full max-w-sm bg-background border-l border-border h-full overflow-y-auto p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-lg text-foreground">{notesMember.name || notesMember.email}</h2>
                {notesMember.name && <p className="text-secondary text-xs">{notesMember.email}</p>}
              </div>
              <button onClick={() => setNotesMember(null)} className="text-secondary hover:text-foreground text-xl leading-none">×</button>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-surface rounded-lg p-1">
              {(['notes', 'passes', 'pauses', 'scaling'] as const).map(t => (
                <button key={t} onClick={() => setMemberPanel(t)}
                  className={`flex-1 py-1.5 text-xs font-medium capitalize rounded transition-colors ${
                    memberPanel === t ? 'bg-accent text-background' : 'text-secondary hover:text-foreground'
                  }`}>{t}</button>
              ))}
            </div>
            {memberPanel === 'notes' && <MemberNotes memberId={notesMember.id} />}
            {memberPanel === 'passes' && <MemberPasses memberId={notesMember.id} />}
            {memberPanel === 'pauses' && <MemberPauses memberId={notesMember.id} />}
            {memberPanel === 'scaling' && <MemberScaling memberId={notesMember.id} />}
          </div>
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
