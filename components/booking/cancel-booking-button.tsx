'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleCancel() {
    setLoading(true); setError(null)
    const res = await fetch('/api/bookings', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError((d as { error?: string }).error ?? 'Cancellation failed'); return }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleCancel}
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded border border-border text-secondary hover:text-danger hover:border-danger-40 transition-colors disabled:opacity-50"
      >
        {loading ? '…' : 'Cancel'}
      </button>
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  )
}
