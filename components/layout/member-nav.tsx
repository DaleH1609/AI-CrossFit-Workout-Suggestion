'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { KovaLogo } from '@/components/ui/kova-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const nav = [
  {
    href: '/this-week',
    label: 'This Week',
    icon: (
      <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/my-schedule',
    label: 'Schedule',
    icon: (
      <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/benchmarks',
    label: 'Progress',
    icon: (
      <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 17l4-4 4 4 5-5 5 5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 21h18" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/challenges',
    label: 'Challenges',
    icon: (
      <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function MemberNav() {
  const path = usePathname()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:flex border-b border-border bg-surface px-8 py-4 items-center justify-between">
        <KovaLogo size="sm" />
        <div className="flex items-center gap-6">
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              className={cn('text-sm transition-colors', path === item.href ? 'text-accent' : 'text-secondary hover:text-foreground')}>
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
          <button onClick={signOut} className="text-secondary text-sm hover:text-foreground transition-colors">Sign Out</button>
        </div>
      </nav>

      {/* Mobile top bar (logo only) */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 border-b border-border bg-surface">
        <KovaLogo size="sm" />
        <ThemeToggle />
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-border">
        <div className="flex items-center">
          {nav.map(item => {
            const isActive = path === item.href
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-3 transition-colors',
                  isActive ? 'text-accent' : 'text-secondary'
                )}>
                {item.icon}
                <span className="text-[10px] tracking-wide">{item.label}</span>
                {isActive && <span className="w-1 h-1 rounded-full bg-accent" />}
              </Link>
            )
          })}
          <button
            onClick={signOut}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-secondary"
          >
            <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[10px] tracking-wide">Sign Out</span>
          </button>
        </div>
      </nav>
    </>
  )
}
