'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function ProfilePage() {
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    await supabase.auth.updateUser({ password })
    setPassword('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">Profile</h1>
      <Card className="max-w-md">
        <h2 className="text-white font-semibold mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="New password" minLength={8} required
            className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white placeholder-secondary focus:outline-none focus:border-accent"
          />
          <Button type="submit">{saved ? 'Updated!' : 'Update Password'}</Button>
        </form>
      </Card>
    </div>
  )
}
