// app/(coach)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase.from('users')
    .select('role, name').eq('id', user.id).single()

  const role = (userData as unknown as { role: string } | null)?.role
  if (role !== 'coach' && role !== 'admin' && role !== 'owner') redirect('/this-week')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface px-6 py-4 flex items-center justify-between">
        <div>
          <span className="font-display text-accent text-lg font-bold tracking-wide">KOVA</span>
          <span className="ml-3 text-xs text-secondary uppercase tracking-widest">Coach</span>
        </div>
        <span className="text-sm text-secondary">{(userData as unknown as { name?: string } | null)?.name}</span>
      </header>
      <main className="p-6 max-w-4xl mx-auto">{children}</main>
    </div>
  )
}
