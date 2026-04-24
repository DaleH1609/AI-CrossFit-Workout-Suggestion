// components/layout/admin-sidebar.tsx
'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { KovaLogo } from '@/components/ui/kova-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { createClient } from '@/lib/supabase/client'

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconOverview() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function IconGyms() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9l9-7 9 7v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" strokeLinejoin="round"/>
      <path d="M9 22V12h6v10" strokeLinejoin="round"/>
    </svg>
  )
}
function IconSearch() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
    </svg>
  )
}
function IconArrowLeft() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconSignOut() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round"/>
    </svg>
  )
}

const nav = [
  { href: '/admin',        label: 'Overview',     Icon: IconOverview },
  { href: '/admin/gyms',   label: 'Gyms',         Icon: IconGyms     },
  { href: '/admin/users',  label: 'User Lookup',  Icon: IconSearch   },
]

export function AdminSidebar() {
  const path = usePathname()
  const [isOpen, setIsOpen] = useState(false)
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

  const isActive = (href: string) =>
    href === '/admin' ? path === '/admin' : path.startsWith(href)

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
          <div className="flex flex-col">
            <KovaLogo size="sm" />
            <span className="text-[10px] font-semibold tracking-widest text-secondary uppercase mt-1">Platform Admin</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-secondary hover:text-foreground text-xl leading-none" aria-label="Close">✕</button>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {nav.map(({ href, label, Icon }) => (
            <Link key={href} href={href} onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors border-l-2',
                isActive(href) ? 'border-accent text-accent bg-accent-5' : 'border-transparent text-secondary hover:text-foreground hover:bg-surface-raised'
              )}>
              <Icon />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm text-secondary hover:text-foreground rounded-md transition-colors">
            <IconArrowLeft />
            Back to app
          </Link>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-secondary">Theme</span>
            <ThemeToggle />
          </div>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-secondary hover:text-foreground rounded-md transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Desktop hover-expand sidebar ── */}
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
        <div className={cn(
          'shrink-0 border-b border-border flex flex-col',
          expanded ? 'px-6 py-4' : 'py-[18px] items-center justify-center'
        )}>
          {expanded ? (
            <>
              <KovaLogo size="sm" />
              <span className="text-[10px] font-semibold tracking-widest text-secondary uppercase mt-1">Platform Admin</span>
            </>
          ) : (
            <span className="font-display text-accent font-bold text-lg leading-none select-none">K</span>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {nav.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              title={!expanded ? label : undefined}
              className={cn(
                'flex items-center gap-3 py-2.5 rounded-md transition-colors border-l-2 whitespace-nowrap',
                expanded ? 'px-3' : 'justify-center px-0',
                isActive(href) ? 'border-accent text-accent bg-accent-5' : 'border-transparent text-secondary hover:text-foreground hover:bg-surface-raised'
              )}
            >
              <span className="shrink-0"><Icon /></span>
              {expanded && <span className="text-sm">{label}</span>}
            </Link>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border py-3 px-2 space-y-0.5">
          <Link
            href="/dashboard"
            title={!expanded ? 'Back to app' : undefined}
            className={cn(
              'flex items-center gap-3 py-2.5 rounded-md text-secondary hover:text-foreground hover:bg-surface-raised transition-colors border-l-2 border-transparent whitespace-nowrap',
              expanded ? 'px-3' : 'justify-center px-0'
            )}
          >
            <span className="shrink-0"><IconArrowLeft /></span>
            {expanded && <span className="text-sm">Back to app</span>}
          </Link>
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
