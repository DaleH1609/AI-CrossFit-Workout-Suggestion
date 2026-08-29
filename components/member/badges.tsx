'use client'
import { useState, useEffect } from 'react'

interface Badge {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  earned: boolean
  earned_at: string | null
}

export function MemberBadges() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [referralEmail, setReferralEmail] = useState('')
  const [referrals, setReferrals] = useState<{ id: string; referred_email: string; status: string }[]>([])
  const [referralSaving, setReferralSaving] = useState(false)
  const [referralError, setReferralError] = useState('')
  const [referralSuccess, setReferralSuccess] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/members/badges').then(r => r.json()),
      fetch('/api/members/referrals').then(r => r.json()),
    ]).then(([b, r]) => {
      setBadges(b)
      setReferrals(r)
      setLoading(false)
    })
  }, [])

  async function handleReferral(e: React.FormEvent) {
    e.preventDefault()
    setReferralError('')
    setReferralSuccess(false)
    setReferralSaving(true)
    const res = await fetch('/api/members/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: referralEmail }),
    })
    if (res.ok) {
      setReferralEmail('')
      setReferralSuccess(true)
      const newRef = await res.json()
      setReferrals(prev => [newRef, ...prev])
      setTimeout(() => setReferralSuccess(false), 3000)
    } else {
      const d = await res.json().catch(() => ({}))
      setReferralError(d.error ?? 'Failed to send referral')
    }
    setReferralSaving(false)
  }

  const earned = badges.filter(b => b.earned)
  const locked = badges.filter(b => !b.earned)

  if (loading) return <p className="text-secondary text-sm">Loading…</p>

  return (
    <div className="space-y-8">
      {/* Earned badges */}
      <div>
        <p className="text-xs text-secondary uppercase tracking-wider mb-3">{earned.length} Earned</p>
        {earned.length === 0 ? (
          <p className="text-secondary-60 text-sm italic">No badges yet - keep showing up!</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {earned.map(b => (
              <div key={b.id} className="flex flex-col items-center gap-1 w-16" title={b.description}>
                <div className="w-12 h-12 rounded-full bg-accent-10 border border-accent-30 flex items-center justify-center text-2xl">
                  {b.icon}
                </div>
                <span className="text-[10px] text-foreground text-center leading-tight">{b.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Locked badges */}
      {locked.length > 0 && (
        <div>
          <p className="text-xs text-secondary uppercase tracking-wider mb-3">Upcoming</p>
          <div className="flex flex-wrap gap-3">
            {locked.map(b => (
              <div key={b.id} className="flex flex-col items-center gap-1 w-16 opacity-35" title={b.description}>
                <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-2xl grayscale">
                  {b.icon}
                </div>
                <span className="text-[10px] text-secondary text-center leading-tight">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referrals */}
      <div>
        <p className="text-xs text-secondary uppercase tracking-wider mb-3">Refer a Friend</p>
        <form onSubmit={handleReferral} className="flex gap-2 mb-3">
          <input
            type="email"
            value={referralEmail}
            onChange={e => setReferralEmail(e.target.value)}
            placeholder="friend@email.com"
            required
            className="flex-1 px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors"
          />
          <button type="submit" disabled={referralSaving}
            className="px-3 py-2 bg-accent text-background text-xs font-bold rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50 whitespace-nowrap">
            {referralSaving ? '…' : 'Refer →'}
          </button>
        </form>
        {referralError && <p className="text-danger text-xs mb-2">{referralError}</p>}
        {referralSuccess && <p className="text-accent text-xs mb-2">✓ Referral sent!</p>}
        {referrals.length > 0 && (
          <div className="space-y-1">
            {referrals.map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-secondary">{r.referred_email}</span>
                <span className={`capitalize px-1.5 py-0.5 rounded-full text-[10px] ${
                  r.status === 'credited' ? 'bg-success/10 text-success'
                  : r.status === 'joined' ? 'bg-accent-10 text-accent'
                  : 'bg-surface text-secondary border border-border'
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
