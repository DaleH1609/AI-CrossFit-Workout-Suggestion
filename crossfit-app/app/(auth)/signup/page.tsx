'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const TIMEZONES = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Australia/Sydney']

export default function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '', gymName: '', timezone: 'America/New_York' })
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-surface rounded-card border border-accent-border">
        <h1 className="font-display text-2xl text-white mb-6">Create Your Gym</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(['gymName','email','password'] as const).map(field => (
            <input key={field} type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
              value={form[field]} onChange={e => setForm(f => ({...f, [field]: e.target.value}))}
              placeholder={field === 'gymName' ? 'Gym Name' : field.charAt(0).toUpperCase() + field.slice(1)}
              required className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white placeholder-secondary focus:outline-none focus:border-accent"
            />
          ))}
          <select value={form.timezone} onChange={e => setForm(f => ({...f, timezone: e.target.value}))}
            className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white focus:outline-none focus:border-accent">
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button type="submit" className="w-full">Create Account</Button>
        </form>
      </div>
    </div>
  )
}
