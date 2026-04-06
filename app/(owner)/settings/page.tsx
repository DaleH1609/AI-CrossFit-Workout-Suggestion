'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const TIMEZONES = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Australia/Sydney']

const GYM_TYPES = [
  { value: 'crossfit' as const, label: 'CrossFit', description: 'Classic WODs, strength work, and functional fitness' },
  { value: 'hyrox' as const, label: 'Hyrox', description: 'Race-format training with ski erg, sleds, and functional stations' },
]

export default function SettingsPage() {
  const [gym, setGym] = useState<{ name: string; timezone: string; gym_type: 'crossfit' | 'hyrox' } | null>(null)
  const [saved, setSaved] = useState(false)
  const [gymTypeSaved, setGymTypeSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const client = createClient()
    async function load() {
      const { data: { user } } = await client.auth.getUser()
      if (!user) return
      const { data: userData } = await client.from('users').select('gym_id').eq('id', user.id).single()
      const gymUser = userData as unknown as { gym_id: string } | null
      const { data } = await client.from('gyms').select('name, timezone, gym_type').eq('id', gymUser!.gym_id).single()
      setGym(data as unknown as { name: string; timezone: string; gym_type: 'crossfit' | 'hyrox' } | null)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !gym) return
    const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
    const gymUser = userData as unknown as { gym_id: string } | null
    await supabase.from('gyms').update({ name: gym.name, timezone: gym.timezone }).eq('id', gymUser!.gym_id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleGymTypeChange(gymType: 'crossfit' | 'hyrox') {
    if (!gym) return
    setGym(g => g ? { ...g, gym_type: gymType } : g)
    const res = await fetch('/api/settings/gym', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gymType }),
    })
    if (res.ok) {
      setGymTypeSaved(true)
      setTimeout(() => setGymTypeSaved(false), 2000)
    }
  }

  if (!gym) return null

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">Settings</h1>
      <div className="space-y-6 max-w-md">
        <Card>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-secondary text-xs mb-1 block">Gym Name</label>
              <input value={gym.name} onChange={e => setGym(g => g ? {...g, name: e.target.value} : g)}
                className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-secondary text-xs mb-1 block">Timezone</label>
              <select value={gym.timezone} onChange={e => setGym(g => g ? {...g, timezone: e.target.value} : g)}
                className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white focus:outline-none focus:border-accent">
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <Button type="submit">{saved ? 'Saved!' : 'Save Changes'}</Button>
          </form>
        </Card>

        <Card>
          <div className="space-y-3">
            <div>
              <h2 className="text-white font-semibold text-sm">Gym Type</h2>
              {gymTypeSaved && <p className="text-accent text-xs mt-0.5">Saved!</p>}
            </div>
            <div className="space-y-2">
              {GYM_TYPES.map(({ value, label, description }) => (
                <label key={value} className={`flex items-start gap-3 p-3 rounded-btn border cursor-pointer transition-colors ${gym.gym_type === value ? 'border-accent bg-accent/10' : 'border-accent-border bg-background'}`}>
                  <input type="radio" name="gymType" value={value} checked={gym.gym_type === value}
                    onChange={() => handleGymTypeChange(value)}
                    className="mt-0.5 accent-accent" />
                  <div>
                    <p className="text-white text-sm font-semibold">{label}</p>
                    <p className="text-secondary text-xs">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
