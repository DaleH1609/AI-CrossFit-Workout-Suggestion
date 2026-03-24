'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ClassSlotProps {
  instance: { id: string; local_time: string; starts_at: string; capacity: number }
  confirmedCount: number
  userBooking: { id: string; status: string } | null
}

export function ClassSlot({ instance, confirmedCount, userBooking }: ClassSlotProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const spotsLeft = instance.capacity - confirmedCount
  const isFull = spotsLeft <= 0
  const displayTime = new Date(`1970-01-01T${instance.local_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  async function handleBook() {
    setLoading(true)
    await fetch('/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId: instance.id })
    })
    setLoading(false)
    router.refresh()
  }

  async function handleCancel() {
    setLoading(true)
    await fetch('/api/bookings', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: userBooking!.id })
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between py-2 border-t border-accent-border/50 first:border-t-0">
      <div className="flex items-center gap-3">
        <span className="text-white text-sm font-medium">{displayTime}</span>
        <span className="text-secondary text-xs">{isFull ? 'Full' : `${spotsLeft} of ${instance.capacity} remaining`}</span>
        {userBooking && <Badge variant={userBooking.status as any} label={userBooking.status === 'pending_confirmation' ? 'Confirming' : userBooking.status} />}
      </div>
      {!userBooking && (
        <Button onClick={handleBook} disabled={loading}>
          {isFull ? 'Join Waitlist' : 'Book'}
        </Button>
      )}
      {userBooking && userBooking.status !== 'cancelled' && (
        <Button variant="danger" onClick={handleCancel} disabled={loading}>Cancel</Button>
      )}
    </div>
  )
}
