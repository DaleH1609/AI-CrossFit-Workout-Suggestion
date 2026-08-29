'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { KovaLogo } from '@/components/ui/kova-logo'

function PasswordStrength({ password }: { password: string }) {
  if (password.length === 0) return null

  const hasUpper = /[A-Z]/.test(password)
  const hasSpecial = /[!@#$%^&*]/.test(password)
  const strength = password.length < 8 ? 1
    : password.length < 12 && !hasSpecial ? 2
    : password.length >= 12 && hasSpecial && hasUpper ? 4
    : 3

  const labels = ['', 'Too short', 'Fair', 'Good', 'Strong']
  const colors = ['', 'bg-danger', 'bg-warning', 'bg-accent', 'bg-accent']

  return (
    <div>
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? colors[strength] : 'bg-border'}`} />
        ))}
      </div>
      <p className="text-xs text-secondary">{labels[strength]}</p>
    </div>
  )
}

export default function InvitePage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const params = new URLSearchParams(hash.replace('#', ''))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (access_token && refresh_token) {
      // Strip the tokens from the URL bar immediately — before any async work —
      // so they are not readable by third-party JS running after this tick (N12).
      window.history.replaceState(null, '', window.location.pathname)
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) { router.replace('/login?error=invite_failed'); return }
        setSessionReady(true)
      })
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.replace('/login?error=invite_failed'); return }
        setSessionReady(true)
      })
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    // Brief success moment before redirect
    setSuccess(true)
    setTimeout(() => { window.location.href = '/this-week' }, 400)
  }

  if (!sessionReady) return null

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-3/5 flex-col justify-between p-12"
        style={{ background: '#050508', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 30% 40%, rgba(198,242,78,0.12) 0%, transparent 60%)',
        }} />
        <KovaLogo size="md" />
        <div className="relative">
          <p className="font-display text-4xl font-bold text-white leading-snug mb-4">
            Your gym<br />is waiting.
          </p>
          <p className="text-white/40 text-sm">Set a password to get started.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 bg-surface flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center auth-field" style={{ animationDelay: '0ms' }}>
            <KovaLogo size="md" />
          </div>
          <h1 className="auth-field font-display text-2xl font-bold text-foreground mb-2" style={{ animationDelay: '60ms' }}>Set your password</h1>
          <p className="auth-field text-secondary text-sm mb-8" style={{ animationDelay: '100ms' }}>
            Welcome! Set a password to access your gym.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="auth-field" style={{ animationDelay: '140ms' }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="New password"
                minLength={8}
                required
                className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
              />
              <div className="mt-2">
                <PasswordStrength password={password} />
              </div>
            </div>
            {error && <p className="text-danger text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || success}
              className="auth-field w-full py-2.5 bg-accent text-on-accent text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors active:scale-[0.98] disabled:opacity-70"
              style={{ animationDelay: '180ms' }}
            >
              {success ? 'Welcome to Kova →' : loading ? 'Setting…' : 'Set Password & Enter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
