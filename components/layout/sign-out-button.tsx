'use client'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleSignOut}
      className="px-3 py-1.5 text-xs text-secondary hover:text-foreground border border-border hover:border-accent rounded-btn transition-colors bg-surface"
    >
      Sign Out
    </button>
  )
}
