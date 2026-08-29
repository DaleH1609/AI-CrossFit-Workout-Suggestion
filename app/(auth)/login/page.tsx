'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { KovaLogo } from '@/components/ui/kova-logo'
import { AuthBrandPanel } from '@/components/auth/brand-panel'
import Link from 'next/link'

// Isolated so useSearchParams() doesn't block static prerender of the shell
function PasswordUpdatedBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('message') !== 'password-updated') return null
  return <p className="text-sm text-accent mb-4">Password updated - please sign in with your new password.</p>
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    // Full reload required — forces server to re-read the Supabase session cookie.
    window.location.href = '/'
  }

  return (
    <div className="w-full max-w-sm">
      <div className="lg:hidden mb-8 flex justify-center auth-field" style={{ animationDelay: '0ms' }}>
        <KovaLogo size="md" />
      </div>
      <Link
        href="/"
        className="auth-field inline-flex items-center gap-1.5 text-xs text-secondary hover:text-foreground transition-colors mb-8 group"
        style={{ animationDelay: '40ms' }}
      >
        <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
        Back to home
      </Link>
      <h1
        className="auth-field font-display text-2xl font-bold text-foreground mb-8"
        style={{ animationDelay: '80ms' }}
      >
        Welcome back
      </h1>
      <Suspense>
        <PasswordUpdatedBanner />
      </Suspense>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email" required
          className="auth-field w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
          style={{ animationDelay: '120ms' }}
        />
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" required
          className="auth-field w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
          style={{ animationDelay: '160ms' }}
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-secondary hover:text-foreground transition-colors">
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="auth-field w-full py-2.5 bg-accent text-on-accent text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors active:scale-[0.98] ring-1 ring-transparent hover:ring-accent/20 disabled:opacity-50"
          style={{ animationDelay: '200ms' }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
      <p
        className="auth-field mt-6 text-secondary text-sm text-center"
        style={{ animationDelay: '240ms' }}
      >
        New gym? <Link href="/signup" className="text-accent hover:underline">Create account</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      <AuthBrandPanel />
      <div className="flex-1 bg-surface flex items-center justify-center p-8">
        <LoginForm />
      </div>
    </div>
  )
}
