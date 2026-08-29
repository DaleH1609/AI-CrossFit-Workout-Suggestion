'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function CheckInPage() {
  const searchParams = useSearchParams()
  const instanceId = searchParams.get('i') ?? ''

  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; already?: boolean; message?: string; error?: string } | null>(null)

  // Auto-submit if instanceId is in URL and code is 6 digits
  useEffect(() => {
    if (code.length === 6 && instanceId) handleSubmit()
  }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    if (!instanceId) { setResult({ error: 'No class specified. Use the QR code or link from the gym display.' }); return }
    if (!/^\d{6}$/.test(code.trim())) { setResult({ error: 'Enter the 6-digit code shown at the gym.' }); return }
    setSubmitting(true)
    const res = await fetch('/api/members/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId, code: code.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    setResult(res.ok ? data : { error: data.error ?? 'Check-in failed' })
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-accent-10 border border-accent-20 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" className="text-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-foreground">Class Check-in</h1>
          <p className="text-secondary text-sm mt-1">Enter the 6-digit code shown at the gym</p>
        </div>

        {result?.success || result?.already ? (
          <div className="rounded-xl border border-accent/30 bg-accent-5 p-6 text-center">
            <p className="text-3xl mb-2">✓</p>
            <p className="font-semibold text-foreground">{result.message ?? 'Checked in!'}</p>
            <p className="text-secondary text-xs mt-2">Have a great workout!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setResult(null) }}
              placeholder="000000"
              className="w-full px-4 py-4 bg-surface border border-border rounded-xl text-3xl text-foreground text-center tracking-[0.5em] font-mono placeholder-border focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />
            {result?.error && (
              <div className="px-4 py-3 rounded-lg border border-danger/20 bg-danger/5 text-sm text-danger text-center">
                {result.error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || code.length !== 6}
              className="w-full py-3 bg-accent text-on-accent font-bold rounded-xl hover:bg-accent-90 transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {submitting ? 'Checking in…' : 'Check In'}
            </button>
            {!instanceId && (
              <p className="text-center text-xs text-secondary">Scan the QR code on the gym display or ask your coach for the link.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
