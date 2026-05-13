'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KovaLogo } from '@/components/ui/kova-logo'

export default function MfaVerifyPage() {
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(true)

  useEffect(() => {
    async function resolveFactorId() {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error || !data?.totp?.length) {
        // No enrolled TOTP factor — redirect to enrollment.
        window.location.href = '/mfa/enroll'
        return
      }
      setFactorId(data.totp[0].id)
      setResolving(false)
    }
    resolveFactorId()
  }, [])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // Redirect to / — proxy role routing sends each role to their correct home page.
    window.location.href = '/'
  }

  return (
    <div className="w-full max-w-sm">
      <div className="lg:hidden mb-8 flex justify-center auth-field" style={{ animationDelay: '0ms' }}>
        <KovaLogo size="md" />
      </div>

      <h1 className="auth-field font-display text-2xl font-bold text-foreground mb-2" style={{ animationDelay: '40ms' }}>
        Two-factor verification
      </h1>
      <p className="auth-field text-sm text-secondary mb-8" style={{ animationDelay: '80ms' }}>
        Open your authenticator app and enter the six-digit code for KOVA.
      </p>

      {resolving && (
        <div className="animate-pulse space-y-3">
          <div className="h-10 w-full bg-border rounded" />
          <div className="h-10 w-full bg-border rounded" />
        </div>
      )}

      {!resolving && (
        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="6-digit code"
            required
            autoFocus
            autoComplete="one-time-code"
            className="auth-field w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors tracking-widest text-center"
            style={{ animationDelay: '120ms' }}
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="auth-field w-full py-2.5 bg-accent text-background text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors active:scale-[0.98] ring-1 ring-transparent hover:ring-accent/20 disabled:opacity-50"
            style={{ animationDelay: '160ms' }}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      )}

      <a
        href="/login"
        className="auth-field mt-6 block text-center text-xs text-secondary hover:text-foreground transition-colors"
        style={{ animationDelay: '200ms' }}
      >
        ← Back to sign in
      </a>
    </div>
  )
}
