'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-surface rounded-card border border-accent-border">
        <h1 className="font-display text-2xl text-white mb-6">Sign In</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required
            className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white placeholder-secondary focus:outline-none focus:border-accent"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required
            className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white placeholder-secondary focus:outline-none focus:border-accent"
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button type="submit" className="w-full">Sign In</Button>
        </form>
        <p className="mt-4 text-secondary text-sm text-center">
          New gym? <a href="/signup" className="text-accent hover:underline">Create account</a>
        </p>
      </div>
    </div>
  )
}
