'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { KovaLogo } from '@/components/ui/kova-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const nav = [
  { href: '/this-week', label: 'This Week' },
  { href: '/my-schedule', label: 'My Schedule' },
  { href: '/profile', label: 'Profile' },
]

export function MemberNav() {
  const path = usePathname()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <nav className="border-b border-border bg-surface px-8 py-4 flex items-center justify-between">
      <KovaLogo size="sm" />
      <div className="flex items-center gap-6">
        {nav.map(item => (
          <Link key={item.href} href={item.href}
            className={cn('text-sm transition-colors', path === item.href ? 'text-accent' : 'text-secondary hover:text-foreground')}>
            {item.label}
          </Link>
        ))}
        <ThemeToggle />
        <button onClick={signOut} className="text-secondary text-sm hover:text-foreground">Sign Out</button>
      </div>
    </nav>
  )
}
