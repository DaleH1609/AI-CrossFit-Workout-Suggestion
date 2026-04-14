'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ClassSlotInlineProps {
  instance: { id: string; local_time: string; starts_at: string; capacity: number; name?: string; workout_notes?: string | null }
  confirmedCount: number
  userBooking: { id: string; status: string } | null
}

export function ClassSlotInline({ instance, confirmedCount, userBooking }: ClassSlotInlineProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const spotsLeft = instance.capacity - confirmedCount
  const isFull = spotsLeft <= 0
  const displayTime = new Date(`1970-01-01T${instance.local_time}`).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })

  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000
  const startsAt = new Date(instance.starts_at).getTime()
  const isTooEarly = startsAt > Date.now() + TWO_DAYS_MS
  const opensAt = new Date(startsAt - TWO_DAYS_MS)
  const opensLabel = opensAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const isBooked = !!userBooking && userBooking.status !== 'cancelled'
  const status = userBooking?.status
  const className = instance.name && instance.name !== 'WOD' ? instance.name : null

  async function handleBook() {
    setLoading(true); setError(null)
    const res = await fetch('/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId: instance.id }),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError((d as { error?: string }).error ?? 'Booking failed'); return }
    router.refresh()
  }

  async function handleCancel() {
    setLoading(true); setError(null)
    const res = await fetch('/api/bookings', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: userBooking!.id }),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError((d as { error?: string }).error ?? 'Cancellation failed'); return }
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between px-2.5 py-2 gap-2">
        {/* Left: time + optional class name */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-foreground text-xs font-semibold shrink-0 w-[52px]">{displayTime}</span>
          {className && (
            <span className="text-accent text-xs truncate">{className}</span>
          )}
        </div>

        {/* Right: spots / status + action */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Spots count or booked status */}
          {!isBooked && !isTooEarly && (
            <span className={`text-xs ${isFull ? 'text-danger/70' : 'text-secondary'}`}>
              {isFull ? 'Full' : `${spotsLeft}/${instance.capacity}`}
            </span>
          )}
          {isBooked && (
            <span className={`text-xs font-medium ${
              status === 'confirmed' ? 'text-green-400'
              : status === 'waitlisted' ? 'text-yellow-400'
              : 'text-secondary'
            }`}>
              {status === 'confirmed' ? '✓ Booked' : status === 'waitlisted' ? 'Waitlisted' : 'Pending'}
            </span>
          )}

          {/* Action */}
          {isTooEarly && !isBooked && (
            <span className="text-secondary text-xs">Opens {opensLabel}</span>
          )}
          {!isTooEarly && !isBooked && (
            <button
              onClick={handleBook}
              disabled={loading}
              className="text-xs px-2.5 py-1 rounded border border-accent-40 text-accent hover:bg-accent-10 transition-colors disabled:opacity-50 font-medium"
            >
              {loading ? '…' : isFull ? 'Waitlist' : 'Book'}
            </button>
          )}
          {isBooked && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="text-xs px-2 py-1 rounded border border-border text-secondary hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-50"
            >
              {loading ? '…' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-danger text-xs px-2.5 pb-1.5">{error}</p>}
    </div>
  )
}
