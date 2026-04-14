'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function ProfilePage() {
  const [name, setName] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState('')

  const [password, setPassword] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function loadName() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('name').eq('id', user.id).single()
      if (data) setName((data as { name: string }).name ?? '')
    }
    loadName()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setNameError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('users').update({ name }).eq('id', user.id)
    if (error) { setNameError(error.message); return }
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setPasswordError(error.message); return }
    setPassword('')
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 2000)
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground mb-6">Profile</h1>
      <div className="space-y-4 max-w-md">
        <Card>
          <h2 className="text-foreground font-semibold mb-4">Your Name</h2>
          <form onSubmit={handleSaveName} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full px-3 py-2 bg-background border border-border rounded-btn text-foreground placeholder-secondary focus:outline-none focus:border-accent"
            />
            {nameError && <p className="text-danger text-sm">{nameError}</p>}
            <Button type="submit">{nameSaved ? 'Saved!' : 'Save Name'}</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-foreground font-semibold mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password"
              minLength={8}
              required
              className="w-full px-3 py-2 bg-background border border-border rounded-btn text-foreground placeholder-secondary focus:outline-none focus:border-accent"
            />
            {passwordError && <p className="text-danger text-sm">{passwordError}</p>}
            <Button type="submit">{passwordSaved ? 'Updated!' : 'Update Password'}</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
