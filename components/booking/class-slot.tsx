'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ClassSlotProps {
  instance: { id: string; local_time: string; starts_at: string; capacity: number; name?: string; workout_notes?: string | null }
  confirmedCount: number
  userBooking: { id: string; status: string } | null
}

export function ClassSlot({ instance, confirmedCount, userBooking }: ClassSlotProps) {
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
  const opensLabel = `Opens ${opensAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`

  const isBooked = !!userBooking && userBooking.status !== 'cancelled'
  const status = userBooking?.status

  async function handleBook() {
    setLoading(true); setError(null)
    const res = await fetch('/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId: instance.id }),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Booking failed'); return }
    router.refresh()
  }

  async function handleCancel() {
    setLoading(true); setError(null)
    const res = await fetch('/api/bookings', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: userBooking!.id }),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Cancellation failed'); return }
    router.refresh()
  }

  const className = instance.name && instance.name !== 'WOD' ? instance.name : null

  return (
    <div className="rounded-lg border border-accent-border bg-background p-3 flex flex-col gap-2">
      {/* Time + spots */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-white font-semibold text-sm">{displayTime}</span>
          {className && (
            <span className="ml-2 text-xs font-medium text-accent">{className}</span>
          )}
        </div>
        <span className={`text-xs font-medium ${isFull ? 'text-danger/80' : 'text-secondary'}`}>
          {isFull ? 'Full' : `${spotsLeft} / ${instance.capacity}`}
        </span>
      </div>

      {/* Workout notes for non-WOD classes */}
      {instance.workout_notes && (
        <p className="text-secondary text-xs leading-relaxed">{instance.workout_notes}</p>
      )}

      {/* Status badge when booked */}
      {isBooked && (
        <div className={`text-xs font-medium px-2 py-1 rounded text-center ${
          status === 'confirmed'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : status === 'waitlisted'
            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
        }`}>
          {status === 'confirmed' ? 'Confirmed' : status === 'waitlisted' ? 'Waitlisted' : 'Pending'}
        </div>
      )}

      {/* Action */}
      {isTooEarly && !isBooked && (
        <p className="text-secondary text-xs text-center">{opensLabel}</p>
      )}

      {!isTooEarly && !isBooked && (
        <button
          onClick={handleBook}
          disabled={loading}
          className="w-full py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-50
            bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20"
        >
          {loading ? 'Booking…' : isFull ? 'Join Waitlist' : 'Book Class'}
        </button>
      )}

      {isBooked && (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="w-full py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50
            bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20"
        >
          {loading ? 'Cancelling…' : 'Cancel booking'}
        </button>
      )}

      {error && <p className="text-danger text-xs text-center">{error}</p>}
    </div>
  )
}
