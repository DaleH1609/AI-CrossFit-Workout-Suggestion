'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type BadgeVariant = 'draft' | 'published' | 'confirmed' | 'waitlisted' | 'pending_confirmation'

interface ClassSlotProps {
  instance: { id: string; local_time: string; starts_at: string; capacity: number }
  confirmedCount: number
  userBooking: { id: string; status: string } | null
}

export function ClassSlot({ instance, confirmedCount, userBooking }: ClassSlotProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const spotsLeft = instance.capacity - confirmedCount
  const isFull = spotsLeft <= 0
  const displayTime = new Date(`1970-01-01T${instance.local_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  // 2-day booking window — compute client-side to avoid unnecessary API calls
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000
  const startsAt = new Date(instance.starts_at).getTime()
  const isTooEarly = startsAt > Date.now() + TWO_DAYS_MS
  const opensAt = new Date(startsAt - TWO_DAYS_MS)
  const opensLabel = `Opens ${opensAt.toLocaleDateString('en-US', { weekday: 'long' })} at ${opensAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()}`

  async function handleBook() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId: instance.id })
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError((data as { error?: string }).error ?? 'Booking failed')
      return
    }
    router.refresh()
  }

  async function handleCancel() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/bookings', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: userBooking!.id })
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError((data as { error?: string }).error ?? 'Cancellation failed')
      return
    }
    router.refresh()
  }

  return (
    <div className="py-2 border-t border-accent-border/50 first:border-t-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-medium">{displayTime}</span>
          <span className="text-secondary text-xs">{isFull ? 'Full' : `${spotsLeft} of ${instance.capacity} remaining`}</span>
          {userBooking && <Badge variant={userBooking.status as BadgeVariant} label={userBooking.status === 'pending_confirmation' ? 'Confirming' : userBooking.status} />}
        </div>
        {!userBooking && isTooEarly && (
          <span className="text-secondary text-xs">{opensLabel}</span>
        )}
        {!userBooking && !isTooEarly && (
          <Button onClick={handleBook} disabled={loading}>
            {isFull ? 'Join Waitlist' : 'Book'}
          </Button>
        )}
        {userBooking && userBooking.status !== 'cancelled' && (
          <Button variant="danger" onClick={handleCancel} disabled={loading}>Cancel</Button>
        )}
      </div>
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  )
}
