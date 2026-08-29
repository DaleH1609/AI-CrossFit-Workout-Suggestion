'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KovaLogo } from '@/components/ui/kova-logo'

export default function MfaEnrollPage() {
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrSvg, setQrSvg] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [enrolling, setEnrolling] = useState(true)

  useEffect(() => {
    async function startEnrollment() {
      const supabase = createClient()

      // Reuse an existing unverified TOTP factor if one exists (prevents
      // duplicate pending factors when the user refreshes the page).
      const { data: existingFactors } = await supabase.auth.mfa.listFactors()
      const unverified = existingFactors?.totp?.find(f => f.factor_type === 'totp' && (f.status as string) === 'unverified')
      if (unverified) {
        // Re-enroll to get a fresh QR code and secret for the existing factor.
        await supabase.auth.mfa.unenroll({ factorId: unverified.id })
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      })
      if (error || !data) {
        setError('Could not start MFA enrollment. Please refresh and try again.')
        setEnrolling(false)
        return
      }
      setFactorId(data.id)
      setQrSvg(data.totp.qr_code)
      setSecret(data.totp.secret)
      setEnrolling(false)
    }
    startEnrollment()
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
    // Full reload — server needs to re-read the session with aal2.
    // Redirect to / — proxy role routing sends each role to their correct home page.
    window.location.href = '/'
  }

  async function handleCancel() {
    if (!factorId) { window.location.href = '/login'; return }
    const supabase = createClient()
    await supabase.auth.mfa.unenroll({ factorId })
    window.location.href = '/login'
  }

  return (
    <div className="w-full max-w-sm">
      <div className="lg:hidden mb-8 flex justify-center auth-field" style={{ animationDelay: '0ms' }}>
        <KovaLogo size="md" />
      </div>

      <h1 className="auth-field font-display text-2xl font-bold text-foreground mb-2" style={{ animationDelay: '40ms' }}>
        Set up two-factor auth
      </h1>
      <p className="auth-field text-sm text-secondary mb-6" style={{ animationDelay: '80ms' }}>
        Owner accounts require an authenticator app (Google Authenticator, Authy, 1Password, etc.).
        Scan the QR code, then enter the six-digit code to activate.
      </p>

      {enrolling && (
        <div className="animate-pulse space-y-3">
          <div className="h-40 w-40 bg-border rounded mx-auto" />
          <div className="h-4 w-48 bg-border rounded mx-auto" />
        </div>
      )}

      {!enrolling && qrSvg && (
        <>
          {/* QR code - SVG comes directly from Supabase, safe to render */}
          <div
            className="auth-field mx-auto mb-4 rounded-lg overflow-hidden bg-white p-3 w-fit"
            style={{ animationDelay: '120ms' }}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          {secret && (
            <div className="auth-field mb-6" style={{ animationDelay: '160ms' }}>
              <p className="text-xs text-secondary mb-1">Or enter the key manually:</p>
              <code className="block text-xs font-mono bg-background border border-border rounded px-3 py-2 text-foreground break-all select-all">
                {secret}
              </code>
            </div>
          )}

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
              autoComplete="one-time-code"
              className="auth-field w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors tracking-widest text-center"
              style={{ animationDelay: '200ms' }}
            />
            {error && <p className="text-danger text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="auth-field w-full py-2.5 bg-accent text-on-accent text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors active:scale-[0.98] ring-1 ring-transparent hover:ring-accent/20 disabled:opacity-50"
              style={{ animationDelay: '240ms' }}
            >
              {loading ? 'Verifying…' : 'Activate'}
            </button>
          </form>

          <button
            onClick={handleCancel}
            className="auth-field mt-4 w-full text-center text-xs text-secondary hover:text-foreground transition-colors"
            style={{ animationDelay: '280ms' }}
          >
            Cancel and sign out
          </button>
        </>
      )}

      {!enrolling && !qrSvg && error && (
        <p className="text-danger text-sm">{error}</p>
      )}
    </div>
  )
}
