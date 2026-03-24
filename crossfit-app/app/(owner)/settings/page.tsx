'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const TIMEZONES = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Australia/Sydney']

export default function SettingsPage() {
  const [gym, setGym] = useState<{ name: string; timezone: string } | null>(null)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
      const { data } = await supabase.from('gyms').select('name, timezone').eq('id', (userData as any)!.gym_id).single()
      setGym(data as any)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !gym) return
    const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
    await supabase.from('gyms').update({ name: gym.name, timezone: gym.timezone }).eq('id', (userData as any)!.gym_id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!gym) return null

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">Settings</h1>
      <Card className="max-w-md">
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
    </div>
  )
}
