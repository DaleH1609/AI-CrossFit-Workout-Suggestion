'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KovaLogo } from '@/components/ui/kova-logo'
import { Dropdown } from '@/components/ui/dropdown'
import Link from 'next/link'

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York',   label: 'Eastern Time (ET)' },
  { value: 'America/Chicago',    label: 'Central Time (CT)' },
  { value: 'America/Denver',     label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles',label: 'Pacific Time (PT)' },
  { value: 'Europe/London',      label: 'London (GMT/BST)' },
  { value: 'Australia/Sydney',   label: 'Sydney (AEST)' },
]

const GYM_TYPES = [
  { value: 'crossfit', label: 'CrossFit', description: 'Classic WODs, strength work, and functional fitness' },
  { value: 'hyrox',    label: 'Hyrox',    description: 'Race-format training with ski erg, sleds, and functional stations' },
]

export default function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '', gymName: '', timezone: 'America/New_York', gymType: 'crossfit' as 'crossfit' | 'hyrox' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      router.push('/login')
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-3/5 flex-col justify-between p-12"
        style={{ background: '#050508', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 30% 40%, rgba(212,175,55,0.12) 0%, transparent 60%)',
        }} />
        <KovaLogo size="md" />
        <div className="relative">
          <p className="font-display text-4xl font-bold text-white leading-snug mb-4">
            Your program,<br />refined by AI.
          </p>
          <p className="text-sm text-white/50">Trusted by 500+ gyms worldwide.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 bg-surface flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center"><KovaLogo size="md" /></div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-8">Create your gym</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={form.gymName}
              onChange={e => setForm(f => ({ ...f, gymName: e.target.value }))}
              placeholder="Gym Name" required
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
            />
            <input type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Email" required
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
            />
            <input type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Password" required
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
            />

            <Dropdown
              value={form.timezone}
              onChange={tz => setForm(f => ({ ...f, timezone: tz }))}
              options={TIMEZONE_OPTIONS}
              placeholder="Select timezone"
            />

            <div>
              <p className="text-xs text-secondary uppercase tracking-wider mb-2">Gym Type</p>
              <div className="space-y-2">
                {GYM_TYPES.map(({ value, label, description }) => (
                  <label key={value}
                    className={`flex items-start gap-3 p-3 rounded-btn border cursor-pointer transition-colors ${form.gymType === value ? 'border-accent bg-accent-10' : 'border-border bg-background'}`}>
                    <input type="radio" name="gymType" value={value} checked={form.gymType === value}
                      onChange={() => setForm(f => ({ ...f, gymType: value as 'crossfit' | 'hyrox' }))}
                      className="mt-0.5 accent-accent" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-secondary">{description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-accent text-background text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50">
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
          <p className="mt-6 text-secondary text-sm text-center">
            Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
