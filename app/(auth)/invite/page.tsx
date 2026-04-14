'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { KovaLogo } from '@/components/ui/kova-logo'

export default function InvitePage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const params = new URLSearchParams(hash.replace('#', ''))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) { router.replace('/login?error=invite_failed'); return }
        window.history.replaceState(null, '', window.location.pathname)
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
    // Full reload required — forces server to re-read the Supabase session cookie.
    // Using router.push here would serve a stale RSC payload from before auth.
    window.location.href = '/this-week'
  }

  if (!sessionReady) return null

  return (
    <div className="min-h-screen flex">
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
      <div className="flex-1 bg-surface flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center"><KovaLogo size="md" /></div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Set Your Password</h1>
          <p className="text-secondary text-sm mb-8">Welcome! Set a password to access your gym.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password" minLength={8} required
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
            />
            {error && <p className="text-danger text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-accent text-background text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors">
              {loading ? 'Setting…' : 'Set Password & Enter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
