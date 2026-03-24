'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { KovaLogo } from '@/components/ui/kova-logo'

const nav = [
  { href: '/dashboard', label: 'Weekly Program' },
  { href: '/style-profile', label: 'Style Profile' },
  { href: '/schedule', label: 'Class Schedule' },
  { href: '/members', label: 'Members' },
  { href: '/settings', label: 'Settings' },
]

export function OwnerSidebar() {
  const path = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 min-h-screen bg-surface border-r border-accent-border flex flex-col">
      <div className="p-6 border-b border-accent-border">
        <KovaLogo size="sm" />
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(item => (
          <Link key={item.href} href={item.href}
            className={cn(
              'block px-3 py-2 rounded-btn text-sm transition-colors',
              path === item.href ? 'bg-accent/10 text-accent' : 'text-secondary hover:text-white'
            )}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-accent-border">
        <button
          onClick={handleSignOut}
          className="block w-full px-3 py-2 rounded-btn text-sm text-secondary hover:text-white transition-colors text-left">
          Sign Out
        </button>
      </div>
    </aside>
  )
}
