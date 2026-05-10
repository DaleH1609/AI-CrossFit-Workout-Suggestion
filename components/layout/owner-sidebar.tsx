'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { KovaLogo } from '@/components/ui/kova-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { createClient } from '@/lib/supabase/client'

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconCalendar() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/>
    </svg>
  )
}
function IconSparkle() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-3.5-6.5-2 2m-7 7-2 2m11 0-2-2m-7-7-2-2" strokeLinecap="round"/>
    </svg>
  )
}
function IconClock() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconUsers() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="7" r="4"/>
      <path d="M3 21v-1a6 6 0 0 1 6-6h0a6 6 0 0 1 6 6v1" strokeLinecap="round"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-1a4 4 0 0 0-3-3.85" strokeLinecap="round"/>
    </svg>
  )
}
function IconSettings() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round"/>
    </svg>
  )
}
function IconSignOut() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconPencil() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Nav items ────────────────────────────────────────────────────────────────
const nav = [
  { href: '/dashboard',     label: 'Weekly Program', Icon: IconCalendar },
  { href: '/style-profile', label: 'Style Profile',  Icon: IconSparkle  },
  { href: '/schedule',      label: 'Class Schedule', Icon: IconClock    },
  { href: '/members',       label: 'Members',        Icon: IconUsers    },
  { href: '/wod-blog',      label: 'WOD Blog',       Icon: IconPencil   },
  { href: '/settings',      label: 'Settings',       Icon: IconSettings },
]

export function OwnerSidebar() {
  const path = usePathname()

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
            return (
              <Link key={href} href={href} onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors border-l-2',
                  isActive ? 'border-accent text-accent bg-accent-5' : 'border-transparent text-secondary hover:text-foreground hover:bg-surface-raised'
                )}>
                <Icon />
                {label}
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
            <IconSignOut />
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
            return (
              <Link
                key={href}
                href={href}
                title={!expanded ? label : undefined}
                className={cn(
                  'flex items-center gap-3 py-2.5 rounded-md transition-colors border-l-2 whitespace-nowrap',
                  expanded ? 'px-3' : 'justify-center px-0',
                  isActive
                    ? 'border-accent text-accent bg-accent-5'
                    : 'border-transparent text-secondary hover:text-foreground hover:bg-surface-raised'
                )}
              >
                <span className="shrink-0"><Icon /></span>
                {expanded && <span className="text-sm">{label}</span>}
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
            <span className="shrink-0"><IconSignOut /></span>
            {expanded && <span className="text-sm">Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
