'use client'
// Coach view: upcoming assigned classes with interactive attendance marking + sub requests
import { useState, useEffect, useCallback } from 'react'

interface Booking {
  id: string
  status: string
  attended: boolean | null
  users: { name: string; email: string } | null
}

interface ClassInstance {
  id: string
  starts_at: string
  capacity: number
  class_slot_templates: { name: string } | null
  bookings: Booking[]
}

interface SubRequest {
  id: string
  status: string
  note: string | null
  instance_id: string
  class_instances: { starts_at: string; local_time: string; class_slot_templates: { name: string } | null } | null
  requesting_coach: { id: string; name: string } | null
  claimed_by: { id: string; name: string } | null
}

export default function CoachDashboardPage() {
  const [classes, setClasses] = useState<ClassInstance[]>([])
  const [subRequests, setSubRequests] = useState<SubRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [subNote, setSubNote] = useState('')
  const [requestingSubFor, setRequestingSubFor] = useState<string | null>(null)
  const [subWorking, setSubWorking] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [classRes, subRes] = await Promise.all([
        fetch('/api/coach/classes'),
        fetch('/api/coach/sub-requests'),
      ])
      if (classRes.ok) setClasses(await classRes.json() ?? [])
      if (subRes.ok) setSubRequests(await subRes.json() ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleAttendance(bookingId: string, current: boolean | null) {
    const next = current ? null : true
    setToggling(bookingId)
    setClasses(prev => prev.map(cls => ({
      ...cls,
      bookings: cls.bookings.map(b => b.id === bookingId ? { ...b, attended: next } : b),
    })))
    try {
      await fetch(`/api/bookings/${bookingId}/attend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attended: next }),
      })
    } catch {
      // revert
      setClasses(prev => prev.map(cls => ({
        ...cls,
        bookings: cls.bookings.map(b => b.id === bookingId ? { ...b, attended: current } : b),
      })))
    } finally {
      setToggling(null)
    }
  }

  async function handleRequestSub(instanceId: string) {
    setSubWorking(instanceId)
    const res = await fetch('/api/coach/sub-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId, note: subNote.trim() || undefined }),
    })
    if (res.ok) { setRequestingSubFor(null); setSubNote(''); await load() }
    setSubWorking(null)
  }

  async function handleSubAction(requestId: string, action: 'claim' | 'cancel') {
    setSubWorking(requestId)
    await fetch(`/api/coach/sub-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setSubWorking(null)
    await load()
  }

  const myInstanceIds = new Set(classes.map(c => c.id))
  // Sub requests for this coach's own assigned classes
  const mySubRequests = subRequests.filter(r => myInstanceIds.has(r.instance_id) && r.status !== 'cancelled')
  // Open sub requests from other coaches available to claim
  const claimableRequests = subRequests.filter(r => !myInstanceIds.has(r.instance_id) && r.status === 'open')

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-secondary text-sm">Loading…</div>
  )

  return (
    <div className="space-y-10">
      {/* My Classes */}
      <div>
        <h1 className="font-display text-3xl text-foreground mb-8">My classes</h1>

        {classes.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center text-secondary text-sm">
            No upcoming classes assigned in the next two weeks.
          </div>
        ) : (
          <div className="space-y-4">
            {classes.map(cls => {
              const confirmed = cls.bookings.filter(b => b.status === 'confirmed').length
              const attended = cls.bookings.filter(b => b.attended === true).length
              const dt = new Date(cls.starts_at)
              const dateStr = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
              const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              const isPast = dt < new Date()
              const existingSubReq = mySubRequests.find(r => r.instance_id === cls.id)
              const isRequestingThis = requestingSubFor === cls.id

              return (
                <div key={cls.id} className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-foreground">
                        {cls.class_slot_templates?.name ?? 'Class'}
                      </p>
                      <p className="text-sm text-secondary mt-0.5">{dateStr} at {timeStr}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-surface-raised border border-border rounded-full px-2.5 py-1 text-secondary">
                        {confirmed}/{cls.capacity} booked
                      </span>
                      {isPast && attended > 0 && (
                        <p className="text-xs text-accent mt-1">{attended} attended</p>
                      )}
                    </div>
                  </div>

                  {cls.bookings.filter(b => b.status !== 'cancelled').length === 0 ? (
                    <p className="text-xs text-secondary">No bookings yet</p>
                  ) : (
                    <div className="space-y-1">
                      {cls.bookings
                        .filter(b => b.status !== 'cancelled')
                        .sort((a, b) => {
                          const order = ['confirmed', 'waitlisted', 'pending_confirmation']
                          return order.indexOf(a.status) - order.indexOf(b.status)
                        })
                        .map(booking => (
                          <div key={booking.id} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                            <button
                              onClick={() => booking.status === 'confirmed' && isPast && toggleAttendance(booking.id, booking.attended ?? null)}
                              disabled={toggling === booking.id || booking.status !== 'confirmed' || !isPast}
                              className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                booking.attended
                                  ? 'bg-accent border-accent text-background'
                                  : booking.status === 'confirmed' && isPast
                                    ? 'border-border hover:border-accent cursor-pointer'
                                    : 'border-border/40 cursor-default'
                              }`}
                              title={isPast ? (booking.attended ? 'Mark absent' : 'Mark attended') : 'Class not started yet'}
                            >
                              {booking.attended && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>
                            <span className="text-sm text-foreground flex-1">
                              {booking.users?.name ?? booking.users?.email ?? '-'}
                            </span>
                            <span className="text-[10px] text-secondary capitalize">
                              {booking.status.replace('_', ' ')}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  )}

                  {isPast && confirmed > 0 && (
                    <p className="text-xs text-secondary mt-3 pt-3 border-t border-border/40">
                      Tap checkbox to mark attendance
                    </p>
                  )}

                  {/* Sub request section - future classes only */}
                  {!isPast && (
                    <div className="mt-3 pt-3 border-t border-border/40">
                      {existingSubReq ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-secondary">
                            Sub request{' '}
                            <span className={`font-medium ${existingSubReq.status === 'claimed' ? 'text-accent' : 'text-secondary'}`}>
                              {existingSubReq.status}
                            </span>
                            {existingSubReq.claimed_by && ` - covered by ${existingSubReq.claimed_by.name}`}
                          </span>
                          {existingSubReq.status === 'open' && (
                            <button
                              onClick={() => handleSubAction(existingSubReq.id, 'cancel')}
                              disabled={subWorking === existingSubReq.id}
                              className="text-xs text-secondary hover:text-danger transition-colors disabled:opacity-50"
                            >
                              {subWorking === existingSubReq.id ? 'Cancelling…' : 'Cancel request'}
                            </button>
                          )}
                        </div>
                      ) : isRequestingThis ? (
                        <div className="space-y-2">
                          <textarea
                            value={subNote}
                            onChange={e => setSubNote(e.target.value)}
                            placeholder="Add a note for other coaches (optional)"
                            rows={2}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-secondary/60 focus:outline-none focus:border-accent resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRequestSub(cls.id)}
                              disabled={subWorking === cls.id}
                              className="text-xs bg-accent text-on-accent px-3 py-1.5 rounded-btn font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                            >
                              {subWorking === cls.id ? 'Sending…' : 'Send request'}
                            </button>
                            <button
                              onClick={() => { setRequestingSubFor(null); setSubNote('') }}
                              className="text-xs text-secondary hover:text-foreground transition-colors px-2"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRequestingSubFor(cls.id)}
                          className="text-xs text-secondary hover:text-foreground transition-colors"
                        >
                          + Request sub
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Available subs from other coaches */}
      {claimableRequests.length > 0 && (
        <div>
          <h2 className="font-display text-xl text-foreground mb-4">Available subs</h2>
          <div className="space-y-3">
            {claimableRequests.map(req => {
              const ci = req.class_instances
              if (!ci) return null
              const dt = new Date(ci.starts_at)
              const dateStr = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
              const timeStr = ci.local_time?.slice(0, 5) ?? dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              return (
                <div key={req.id} className="rounded-xl border border-border bg-surface p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {ci.class_slot_templates?.name ?? 'Class'}
                    </p>
                    <p className="text-xs text-secondary mt-0.5">{dateStr} at {timeStr}</p>
                    {req.requesting_coach && (
                      <p className="text-xs text-secondary mt-0.5">Requested by {req.requesting_coach.name}</p>
                    )}
                    {req.note && (
                      <p className="text-xs text-secondary/70 mt-1 italic">"{req.note}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleSubAction(req.id, 'claim')}
                    disabled={subWorking === req.id}
                    className="shrink-0 text-xs bg-accent text-on-accent px-3 py-1.5 rounded-btn font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    {subWorking === req.id ? 'Claiming…' : 'Claim'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
