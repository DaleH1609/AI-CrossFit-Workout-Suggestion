'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { KovaLogo } from '@/components/ui/kova-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { createClient } from '@/lib/supabase/client'
// Phosphor, matching the landing page. The hand-rolled SVGs below were
// duplicated across destinations — Sparkle appeared on three different
// items, Calendar on two — so the icon carried no wayfinding information.
import {
  CalendarBlank, SquaresFour, Sparkle, Clock, Users, Funnel,
  ChartBar, Trophy, Article, ChatCircle, Gear, SignOut as SignOutIcon,
} from '@phosphor-icons/react'

// ─── Icons ────────────────────────────────────────────────────────────────────


// ─── Nav items ────────────────────────────────────────────────────────────────
const nav = [
  { href: '/dashboard',         label: 'Weekly Program', Icon: CalendarBlank, group: 'Program' },
  { href: '/calendar',          label: 'Macro View',     Icon: SquaresFour,   group: 'Program' },
  { href: '/style-profile',     label: 'Style Profile',  Icon: Sparkle,       group: 'Program' },
  { href: '/schedule',          label: 'Class Schedule', Icon: Clock,         group: 'Program' },
  { href: '/members',           label: 'Members',        Icon: Users,         group: 'People'  },
  { href: '/leads',             label: 'Leads',          Icon: Funnel,        group: 'People'  },
  { href: '/messages',          label: 'Messages',       Icon: ChatCircle,    group: 'People'  },
  { href: '/reports',           label: 'Reports',        Icon: ChartBar,      group: 'Insight' },
  { href: '/manage-challenges', label: 'Challenges',     Icon: Trophy,        group: 'Insight' },
  { href: '/wod-blog',          label: 'WOD Blog',       Icon: Article,       group: 'Insight' },
  { href: '/settings',          label: 'Settings',       Icon: Gear,          group: 'System'  },
]

// ─── Unread badge for Messages ────────────────────────────────────────────────
function MessagesUnreadBadge({ count, expanded }: { count: number; expanded: boolean }) {
  if (count === 0) return null
  const display = count > 99 ? '99+' : String(count)

  return (
    <span className={cn(
      'inline-flex items-center justify-center rounded-full bg-accent text-background font-bold leading-none',
      expanded ? 'ml-auto text-[10px] min-w-[18px] h-[18px] px-1' : 'absolute top-1 right-1 text-[9px] min-w-[14px] h-[14px]'
    )}>
      {display}
    </span>
  )
}

export function OwnerSidebar() {
  const path = usePathname()

  // Unread messages count (single poll shared by mobile and desktop)
  const [ownerUnread, setOwnerUnread] = useState(0)
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/messages/unread')
        if (res.ok) {
          const data = await res.json() as { unread?: number }
          setOwnerUnread(data.unread ?? 0)
        }
      } catch { /* silent */ }
    }
    fetchUnread()
    const id = setInterval(fetchUnread, 30_000)
    return () => clearInterval(id)
  }, [])

  // Mobile state
  const [isOpen, setIsOpen] = useState(false)

  // Desktop hover-expand state
  const [expanded, setExpanded] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout>>()

  function onEnter() {
    clearTimeout(collapseTimer.current)
    setExpanded(true)
  }
  function onLeave() {
    collapseTimer.current = setTimeout(() => setExpanded(false), 180)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* ── Mobile hamburger ── */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-surface border border-border text-foreground rounded-md"
        aria-label="Open navigation menu"
      >
        <span className="block w-5 h-0.5 bg-current mb-1" />
        <span className="block w-5 h-0.5 bg-current mb-1" />
        <span className="block w-5 h-0.5 bg-current" />
      </button>

      {/* ── Mobile overlay ── */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/70" onClick={() => setIsOpen(false)} aria-hidden="true" />
      )}

      {/* ── Mobile slide-out sidebar ── */}
      <aside className={cn(
        'md:hidden w-56 min-h-screen bg-surface border-r border-border flex flex-col',
        'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <KovaLogo size="sm" />
          <button onClick={() => setIsOpen(false)} className="text-secondary hover:text-foreground text-xl leading-none" aria-label="Close">✕</button>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {nav.map(({ href, label, Icon }) => {
            const isActive = path === href
            const isMessages = href === '/messages'
            return (
              <Link key={href} href={href} onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors border-l-2',
                  isActive ? 'border-accent text-accent bg-accent-5' : 'border-transparent text-secondary hover:text-foreground hover:bg-surface-raised'
                )}>
                <Icon />
                {label}
                {isMessages && <MessagesUnreadBadge count={ownerUnread} expanded={true} />}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-1">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-secondary">Theme</span>
            <ThemeToggle />
          </div>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-secondary hover:text-foreground rounded-md transition-colors">
            <SignOutIcon size={19} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Desktop hover-expand sidebar (fixed, overlays content) ── */}
      <aside
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className={cn(
          'hidden md:flex flex-col bg-surface border-r border-border',
          'fixed top-0 left-0 bottom-0 z-40',
          'transition-[width] duration-300 ease-out overflow-hidden',
          expanded ? 'w-56' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'shrink-0 border-b border-border flex items-center',
          expanded ? 'px-6 py-[18px]' : 'py-[18px] justify-center'
        )}>
          {expanded
            ? <KovaLogo size="sm" />
            : <span className="font-display text-accent font-bold text-lg leading-none select-none">K</span>
          }
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {nav.map(({ href, label, Icon }) => {
            const isActive = path === href
            const isMessages = href === '/messages'
            return (
              <Link
                key={href}
                href={href}
                title={!expanded ? label : undefined}
                className={cn(
                  'relative flex items-center gap-3 py-2.5 rounded-md transition-colors border-l-2 whitespace-nowrap',
                  expanded ? 'px-3' : 'justify-center px-0',
                  isActive
                    ? 'border-accent text-accent bg-accent-10 font-medium'
                    : 'border-transparent text-secondary hover:text-foreground hover:bg-surface-raised'
                )}
              >
                <span className="shrink-0"><Icon size={19} weight={isActive ? 'fill' : 'regular'} /></span>
                {expanded && <span className="font-mono text-[11px] tracking-[0.12em] uppercase">{label}</span>}
                {isMessages && <MessagesUnreadBadge count={ownerUnread} expanded={expanded} />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-border py-3 px-2 space-y-0.5">
          <div className={cn('flex items-center py-2 rounded-md', expanded ? 'px-3 justify-between' : 'justify-center')}>
            {expanded && <span className="text-xs text-secondary">Theme</span>}
            <ThemeToggle />
          </div>
          <button
            onClick={signOut}
            title={!expanded ? 'Sign out' : undefined}
            className={cn(
              'w-full flex items-center gap-3 py-2.5 rounded-md text-secondary hover:text-foreground hover:bg-surface-raised transition-colors border-l-2 border-transparent whitespace-nowrap',
              expanded ? 'px-3' : 'justify-center px-0'
            )}
          >
            <span className="shrink-0"><SignOutIcon size={19} /></span>
            {expanded && <span className="text-sm">Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
