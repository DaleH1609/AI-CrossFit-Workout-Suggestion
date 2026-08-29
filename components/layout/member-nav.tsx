'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { KovaLogo } from '@/components/ui/kova-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  CalendarBlank, Clock, ChartLineUp, Trophy, ChatCircle, UserCircle,
} from '@phosphor-icons/react'

const nav = [
  { href: '/this-week',  label: 'This Week',  Icon: CalendarBlank },
  { href: '/my-schedule', label: 'Schedule',  Icon: Clock },
  { href: '/benchmarks', label: 'Progress',   Icon: ChartLineUp },
  { href: '/challenges', label: 'Challenges', Icon: Trophy },
  { href: '/messages',   label: 'Messages',   Icon: ChatCircle },
  { href: '/profile',    label: 'Profile',    Icon: UserCircle },
]

export function MemberNav() {
  const path = usePathname()
  const [memberUnread, setMemberUnread] = useState(0)

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch('/api/messages/unread')
        if (res.ok) {
          const data = await res.json() as { unread?: number }
          setMemberUnread(data.unread ?? 0)
        }
      } catch {
        // silently ignore
      }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30_000)
    return () => clearInterval(interval)
  }, [])

  async function signOut() {
    const supabase = createClient()
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
              className={cn('relative font-mono text-[11px] tracking-[0.12em] uppercase transition-colors', path === item.href ? 'text-accent' : 'text-secondary hover:text-foreground')}>
              {item.label}
              {item.href === '/messages' && memberUnread > 0 && path !== '/messages' && (
                <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-accent" />
              )}
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
            const showUnread = item.href === '/messages' && memberUnread > 0 && !isActive
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-3 transition-colors',
                  isActive ? 'text-accent' : 'text-secondary'
                )}>
                <span className="relative">
                  <item.Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                  {showUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
                  )}
                </span>
                <span className="font-mono text-[9px] tracking-[0.1em] uppercase">{item.label}</span>
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
            <span className="font-mono text-[9px] tracking-[0.1em] uppercase">Sign Out</span>
          </button>
        </div>
      </nav>
    </>
  )
}
