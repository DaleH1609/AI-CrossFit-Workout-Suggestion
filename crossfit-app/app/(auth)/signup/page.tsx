'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { KovaLogo } from '@/components/ui/kova-logo'

const TIMEZONES = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Australia/Sydney']

const GYM_TYPES = [
  { value: 'crossfit' as const, label: 'CrossFit', description: 'Classic WODs, strength work, and functional fitness' },
  { value: 'hyrox' as const, label: 'Hyrox', description: 'Race-format training with ski erg, sleds, and functional stations' },
]

export default function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '', gymName: '', timezone: 'America/New_York', gymType: 'crossfit' as 'crossfit' | 'hyrox' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      router.push('/login')
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <KovaLogo size="md" />
        </div>
      <div className="p-8 bg-surface rounded-card border border-accent-border">
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
          <div>
            <p className="text-secondary text-xs mb-2">Gym Type</p>
            <div className="space-y-2">
              {GYM_TYPES.map(({ value, label, description }) => (
                <label key={value} className={`flex items-start gap-3 p-3 rounded-btn border cursor-pointer transition-colors ${form.gymType === value ? 'border-accent bg-accent/10' : 'border-accent-border bg-background'}`}>
                  <input type="radio" name="gymType" value={value} checked={form.gymType === value}
                    onChange={() => setForm(f => ({...f, gymType: value}))}
                    className="mt-0.5 accent-accent" />
                  <div>
                    <p className="text-white text-sm font-semibold">{label}</p>
                    <p className="text-secondary text-xs">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating…' : 'Create Account'}</Button>
        </form>
      </div>
      </div>
    </div>
  )
}
