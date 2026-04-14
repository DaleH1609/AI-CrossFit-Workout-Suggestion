'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ClassTileProps {
  instance: { id: string; local_time: string; starts_at: string; capacity: number; name?: string | null }
  confirmedCount: number
  userBooking: { id: string; status: string } | null
  bookedMemberNames?: string[]
  waitlistEnabled?: boolean
}

export function ClassTile({ instance, confirmedCount, userBooking, bookedMemberNames, waitlistEnabled = true }: ClassTileProps) {
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
  const opensLabel = new Date(startsAt - TWO_DAYS_MS).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const isBooked = !!userBooking && userBooking.status !== 'cancelled'
  const status = userBooking?.status
  const className = instance.name && instance.name !== 'WOD' ? instance.name : 'CrossFit'

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
      <div className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-150 ${
        isBooked
          ? 'bg-accent-5 border-accent-20 hover:border-accent-35'
          : 'bg-surface border-border hover:border-border hover:bg-surface'
      }`}>
        {/* Left: time + name */}
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-foreground text-sm font-semibold tabular-nums shrink-0 w-[68px]">{displayTime}</span>
          <span className="text-foreground-70 text-sm truncate">{className}</span>
        </div>

        {/* Right: spots + action */}
        <div className="flex items-center gap-3 shrink-0">
          {isBooked ? (
            <>
              <span className={`text-xs font-medium ${
                status === 'confirmed' ? 'text-green-400'
                : status === 'waitlisted' ? 'text-yellow-400'
                : 'text-secondary'
              }`}>
                {status === 'confirmed' ? '✓ Booked' : status === 'waitlisted' ? 'Waitlisted' : 'Pending'}
              </span>
              {!isTooEarly && (
                <button onClick={handleCancel} disabled={loading}
                  className="text-xs px-3 py-1.5 rounded border border-border text-secondary hover:text-danger hover:border-danger-40 transition-colors disabled:opacity-50">
                  {loading ? '…' : 'Cancel'}
                </button>
              )}
            </>
          ) : isTooEarly ? (
            <span className="text-secondary-60 text-xs">Opens {opensLabel}</span>
          ) : isFull && !waitlistEnabled ? (
            <span className="text-danger-60 text-xs">Full</span>
          ) : (
            <>
              <span className={`text-xs tabular-nums ${isFull ? 'text-danger-60' : 'text-secondary'}`}>
                {isFull ? 'Full' : `${spotsLeft}/${instance.capacity}`}
              </span>
              <button onClick={handleBook} disabled={loading}
                className="text-xs px-3 py-1.5 rounded bg-accent-10 border border-accent-40 text-accent hover:bg-accent-20 transition-colors disabled:opacity-50 font-medium">
                {loading ? '…' : isFull ? 'Waitlist' : 'Book'}
              </button>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-danger text-xs mt-1 px-1">{error}</p>}
      {bookedMemberNames && bookedMemberNames.length > 0 && (
        <p className="text-secondary-60 text-xs mt-1 px-1 truncate">
          {bookedMemberNames.join(', ')}
        </p>
      )}
    </div>
  )
}
