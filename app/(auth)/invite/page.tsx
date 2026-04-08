'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function InvitePage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Supabase invite emails use the implicit flow — the access token arrives
    // in the URL hash (#access_token=...&refresh_token=...) not as a ?code= param.
    // @supabase/ssr does NOT auto-detect hash tokens, so we parse and set it manually.
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const params = new URLSearchParams(hash.replace('#', ''))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) {
          router.replace('/login?error=invite_failed')
          return
        }
        // Remove hash from URL bar
        window.history.replaceState(null, '', window.location.pathname)
        setSessionReady(true)
      })
    } else {
      // No hash — check if already has a valid session (e.g. page refresh)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          router.replace('/login?error=invite_failed')
          return
        }
        setSessionReady(true)
      })
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); return }
    router.push('/this-week')
  }

  if (!sessionReady) return null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-surface rounded-card border border-accent-border">
        <h1 className="font-display text-2xl text-white mb-2">Set Your Password</h1>
        <p className="text-secondary text-sm mb-6">Welcome! Set a password to access your gym.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="New password"
            minLength={8}
            required
            className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white placeholder-secondary focus:outline-none focus:border-accent"
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button type="submit" className="w-full">Set Password & Enter</Button>
        </form>
      </div>
    </div>
  )
}
