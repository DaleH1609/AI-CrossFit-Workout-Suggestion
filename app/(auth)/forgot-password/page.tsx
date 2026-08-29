'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KovaLogo } from '@/components/ui/kova-logo'
import { AuthBrandPanel } from '@/components/auth/brand-panel'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    // Always show success to avoid email enumeration
    if (error) console.error('[forgot-password]', error)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex">
      <AuthBrandPanel />
      <div className="flex-1 bg-surface flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center">
            <KovaLogo size="md" />
          </div>
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-foreground transition-colors mb-8 group">
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            Back to login
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Reset password</h1>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-secondary">
                If that email is registered, you&apos;ll receive a reset link shortly. Check your inbox.
              </p>
              <Link href="/login" className="block text-sm text-accent hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-secondary mb-6">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
                />
                {error && <p className="text-danger text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-accent text-on-accent text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
