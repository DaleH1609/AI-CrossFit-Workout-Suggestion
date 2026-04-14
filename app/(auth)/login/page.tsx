'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KovaLogo } from '@/components/ui/kova-logo'
import { AuthBrandPanel } from '@/components/auth/brand-panel'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    // Full reload required — forces server to re-read the Supabase session cookie.
    // Using router.push here would serve a stale RSC payload from before auth.
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex">
      <AuthBrandPanel />

      {/* Right form panel */}
      <div className="flex-1 bg-surface flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center"><KovaLogo size="md" /></div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-8">Welcome back</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email" required
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
            />
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" required
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
            />
            {error && <p className="text-danger text-sm">{error}</p>}
            <button type="submit"
              className="w-full py-2.5 bg-accent text-background text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors">
              Sign In
            </button>
          </form>
          <p className="mt-6 text-secondary text-sm text-center">
            New gym? <Link href="/signup" className="text-accent hover:underline">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
