'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { KovaLogo } from '@/components/ui/kova-logo'

const nav = [
  { href: '/dashboard',     label: 'Weekly Program' },
  { href: '/style-profile', label: 'Style Profile' },
  { href: '/schedule',      label: 'Class Schedule' },
  { href: '/members',       label: 'Members' },
  { href: '/settings',      label: 'Settings' },
]

export function OwnerSidebar() {
  const path = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-surface border border-border text-foreground"
        aria-label="Open navigation menu"
      >
        <span className="block w-5 h-0.5 bg-current mb-1" />
        <span className="block w-5 h-0.5 bg-current mb-1" />
        <span className="block w-5 h-0.5 bg-current" />
      </button>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/70" onClick={() => setIsOpen(false)} aria-hidden="true" />
      )}

      <aside className={cn(
        'w-56 min-h-screen bg-surface border-r border-border flex flex-col',
        'fixed md:static inset-y-0 left-0 z-50 transition-transform duration-200',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <KovaLogo size="sm" />
          <button onClick={() => setIsOpen(false)} className="md:hidden text-secondary hover:text-foreground text-xl leading-none" aria-label="Close navigation menu">✕</button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}
              className={cn(
                'block px-3 py-2 rounded-btn text-sm transition-colors',
                path === item.href ? 'bg-accent-10 text-accent' : 'text-secondary hover:text-foreground'
              )}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}
