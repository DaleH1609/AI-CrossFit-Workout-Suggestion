'use client'
import { useState } from 'react'
import { KovaLogo } from '@/components/ui/kova-logo'
import { AuthBrandPanel } from '@/components/auth/brand-panel'
import { Dropdown } from '@/components/ui/dropdown'
import Link from 'next/link'
import { TIMEZONE_OPTIONS } from '@/lib/timezones'
import { PasswordStrength } from '@/components/ui/password-strength'

const GYM_TYPES = [
  { value: 'crossfit', label: 'CrossFit', description: 'Classic WODs, strength work, and functional fitness' },
  { value: 'hyrox',    label: 'Hyrox',    description: 'Race-format training with ski erg, sleds, and functional stations' },
]

export default function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '', gymName: '', timezone: 'America/New_York', gymType: 'crossfit' as 'crossfit' | 'hyrox' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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
      setSubmitted(true)
    } catch {
      setError('Network error - please try again')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex">
        <AuthBrandPanel />
        <div className="flex-1 bg-surface flex items-center justify-center p-8">
          <div className="w-full max-w-sm text-center">
            <div className="lg:hidden mb-8 flex justify-center"><KovaLogo size="md" /></div>
            <div className="w-12 h-12 rounded-full bg-accent-10 border border-accent/30 flex items-center justify-center mx-auto mb-6">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">Check your email</h1>
            <p className="text-secondary text-sm leading-relaxed mb-2">
              We&apos;ve sent a verification link to
            </p>
            <p className="text-foreground text-sm font-semibold mb-6">{form.email}</p>
            <p className="text-secondary text-sm leading-relaxed mb-8">
              Click the link in the email to verify your account. You&apos;ll be able to sign in once your email is confirmed.
            </p>
            <Link href="/login" className="inline-block w-full py-2.5 bg-accent text-background text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors text-center">
              Go to Sign In
            </Link>
            <p className="mt-4 text-xs text-secondary">
              Didn&apos;t receive it? Check your spam folder.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <AuthBrandPanel />

      {/* Right form panel */}
      <div className="flex-1 bg-surface flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center"><KovaLogo size="md" /></div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-foreground transition-colors mb-8 group">
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            Back to home
          </Link>
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
            <div>
              <input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Password" required
                autoComplete="new-password" spellCheck={false}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
              />
              {/* Only once there is something to rate. Showing four red bars
                  before a character is typed reads as failure, not guidance. */}
              {form.password.length > 0 && (
                <PasswordStrength value={form.password} className="mt-3" />
              )}
            </div>

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
              className="w-full py-2.5 bg-accent text-background text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors active:scale-[0.98] ring-1 ring-transparent hover:ring-accent/20 disabled:opacity-50">
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
