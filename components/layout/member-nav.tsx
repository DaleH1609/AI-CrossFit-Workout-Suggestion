'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { KovaLogo } from '@/components/ui/kova-logo'

const nav = [
  { href: '/this-week', label: 'This Week' },
  { href: '/my-schedule', label: 'My Schedule' },
  { href: '/profile', label: 'Profile' },
]

export function MemberNav() {
  const path = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="border-b border-accent-border bg-surface px-8 py-4 flex items-center justify-between">
      <KovaLogo size="sm" />
      <div className="flex items-center gap-6">
        {nav.map(item => (
          <Link key={item.href} href={item.href}
            className={cn('text-sm transition-colors', path === item.href ? 'text-accent' : 'text-secondary hover:text-white')}>
            {item.label}
          </Link>
        ))}
        <button onClick={signOut} className="text-secondary text-sm hover:text-white">Sign Out</button>
      </div>
    </nav>
  )
}
