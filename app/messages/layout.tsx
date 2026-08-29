import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OwnerSidebar } from '@/components/layout/owner-sidebar'
import { MemberNav } from '@/components/layout/member-nav'
import { ToastProvider } from '@/components/ui/toast'

export const dynamic = 'force-dynamic'

/**
 * Shell for /messages.
 *
 * Messaging is the one route both roles share, so it cannot live inside
 * (owner) or (member) and inherit their layout. It had no layout of its own,
 * which meant it rendered with no sidebar, no nav and no way back: a dead end
 * reachable from a nav link that then stranded you.
 *
 * This picks the correct chrome per role, mirroring what each route group's
 * layout provides, so /messages looks and behaves like every other screen.
 */
export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role, revoked_at')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')
  if (userData.revoked_at) redirect('/suspended')

  // md:ml-16 matches the collapsed sidebar width, same as (owner)/layout.tsx.
  if (userData.role === 'owner' || userData.role === 'coach') {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-background">
          <OwnerSidebar />
          <div className="md:ml-16 flex flex-col min-h-screen">
            <main className="flex-1 p-8 page-fade-in">{children}</main>
          </div>
        </div>
      </ToastProvider>
    )
  }

  // pb-28 clears the fixed mobile bottom bar, same as (member)/layout.tsx.
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <MemberNav />
        <main className="p-8 pb-28 md:pb-8 max-w-7xl mx-auto page-fade-in">{children}</main>
      </div>
    </ToastProvider>
  )
}
