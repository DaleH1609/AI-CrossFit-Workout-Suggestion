'use client'
// Coach view: upcoming assigned classes with interactive attendance marking
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

export default function CoachDashboardPage() {
  const [classes, setClasses] = useState<ClassInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/classes')
      if (!res.ok) return
      const data = await res.json()
      setClasses(data ?? [])
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

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-secondary text-sm">Loading…</div>
  )

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground mb-8">My Classes</h1>

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
                            {booking.users?.name ?? booking.users?.email ?? '—'}
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
