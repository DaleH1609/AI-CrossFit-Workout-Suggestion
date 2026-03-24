'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', label: 'Weekly Program' },
  { href: '/style-profile', label: 'Style Profile' },
  { href: '/schedule', label: 'Class Schedule' },
  { href: '/members', label: 'Members' },
  { href: '/settings', label: 'Settings' },
]

export function OwnerSidebar() {
  const path = usePathname()
  return (
    <aside className="w-56 min-h-screen bg-surface border-r border-accent-border flex flex-col">
      <div className="p-6 border-b border-accent-border">
        <h1 className="font-display text-lg text-white">CrossFit HQ</h1>
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
    </aside>
  )
}
