'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  CalendarBlank, SquaresFour, Sparkle, Clock, Users, Funnel,
  ChartBar, Trophy, Article, ChatCircle, Gear, MagnifyingGlass, ArrowRight,
} from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

/**
 * Command palette (Cmd/Ctrl-K).
 *
 * Built on cmdk, the same primitive shadcn, Linear and Vercel use, so the
 * filtering, roving focus and aria wiring are handled rather than hand-rolled.
 *
 * The reason this earns its place here rather than being decoration: the owner
 * sidebar has eleven destinations and the app has no search at all. Finding one
 * member means navigating to Members and scanning. This makes every screen and
 * every member reachable in two keystrokes.
 *
 * Members are fetched once on first open, not on mount, so the palette costs
 * nothing until it is used.
 */

type NavItem = { href: string; label: string; Icon: typeof CalendarBlank; group: string }

const OWNER_NAV: NavItem[] = [
  { href: '/dashboard',         label: 'Weekly program', Icon: CalendarBlank, group: 'Program' },
  { href: '/calendar',          label: 'Macro view',     Icon: SquaresFour,   group: 'Program' },
  { href: '/style-profile',     label: 'Style profile',  Icon: Sparkle,       group: 'Program' },
  { href: '/schedule',          label: 'Class schedule', Icon: Clock,         group: 'Program' },
  { href: '/members',           label: 'Members',        Icon: Users,         group: 'People'  },
  { href: '/leads',             label: 'Leads',          Icon: Funnel,        group: 'People'  },
  { href: '/messages',          label: 'Messages',       Icon: ChatCircle,    group: 'People'  },
  { href: '/reports',           label: 'Reports',        Icon: ChartBar,      group: 'Insight' },
  { href: '/manage-challenges', label: 'Challenges',     Icon: Trophy,        group: 'Insight' },
  { href: '/wod-blog',          label: 'WOD blog',       Icon: Article,       group: 'Insight' },
  { href: '/settings',          label: 'Settings',       Icon: Gear,          group: 'System'  },
]

const MEMBER_NAV: NavItem[] = [
  { href: '/this-week',   label: 'This week',  Icon: CalendarBlank, group: 'Training' },
  { href: '/my-schedule', label: 'My schedule', Icon: Clock,        group: 'Training' },
  { href: '/benchmarks',  label: 'Progress',   Icon: ChartBar,      group: 'Training' },
  { href: '/challenges',  label: 'Challenges', Icon: Trophy,        group: 'Training' },
  { href: '/messages',    label: 'Messages',   Icon: ChatCircle,    group: 'Training' },
]

type Member = { id: string; email: string; name: string | null }

export function CommandPalette({ role }: { role: 'owner' | 'coach' | 'member' }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [loadedMembers, setLoadedMembers] = useState(false)

  const nav = role === 'member' ? MEMBER_NAV : OWNER_NAV
  const canSearchMembers = role !== 'member'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Deferred until first open: the palette should cost nothing to exist.
  useEffect(() => {
    if (!open || loadedMembers || !canSearchMembers) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/members')
        if (!res.ok) return
        const body = await res.json()
        if (!cancelled) setMembers(body.members ?? [])
      } catch {
        // A failed member fetch must not break navigation, which is the
        // palette's primary job.
      } finally {
        if (!cancelled) setLoadedMembers(true)
      }
    })()
    return () => { cancelled = true }
  }, [open, loadedMembers, canSearchMembers])

  const go = useCallback((href: string) => {
    setOpen(false)
    router.push(href)
  }, [router])

  const groups = Array.from(new Set(nav.map((n) => n.group)))

  return (
    <>
      {/* Discoverable trigger. A shortcut nobody knows about does not exist,
          so the hint is rendered rather than left to be guessed. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="hidden md:inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-secondary transition-colors duration-200 ease-expo hover:border-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <MagnifyingGlass size={13} />
        <span className="font-mono text-[10px] uppercase tracking-[0.15em]">Search</span>
        <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-secondary">⌘K</kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh]"
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />

        <div className="relative w-full max-w-xl rounded-card-lg p-1.5 ring-1 ring-border bg-surface-raised/60 shadow-lift">
          <div className="rounded-card bg-surface shadow-inset-hi overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border px-4">
              <MagnifyingGlass size={16} className="shrink-0 text-secondary" />
              <Command.Input
                autoFocus
                placeholder={canSearchMembers ? 'Search screens and members…' : 'Search screens…'}
                className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-secondary focus:outline-none"
              />
              <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-secondary sm:block">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-secondary">
                Nothing matches that.
              </Command.Empty>

              {groups.map((g) => (
                <Command.Group
                  key={g}
                  heading={g}
                  className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-secondary"
                >
                  {nav.filter((n) => n.group === g).map(({ href, label, Icon }) => (
                    <Command.Item
                      key={href}
                      value={`${label} ${href}`}
                      onSelect={() => go(href)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-btn px-3 py-2 text-sm text-foreground',
                        'data-[selected=true]:bg-accent-10 data-[selected=true]:text-accent',
                      )}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                      <ArrowRight size={13} className="ml-auto opacity-0 data-[selected=true]:opacity-60" />
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}

              {canSearchMembers && members.length > 0 && (
                <Command.Group
                  heading="Members"
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-secondary"
                >
                  {members.map((m) => (
                    <Command.Item
                      key={m.id}
                      value={`${m.name ?? ''} ${m.email}`}
                      onSelect={() => go('/members')}
                      className="flex cursor-pointer items-center gap-3 rounded-btn px-3 py-2 text-sm text-foreground data-[selected=true]:bg-accent-10 data-[selected=true]:text-accent"
                    >
                      <Users size={16} />
                      <span className="truncate">{m.name || m.email}</span>
                      {m.name && (
                        <span className="ml-auto truncate text-xs text-secondary">{m.email}</span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </div>
        </div>
      </Command.Dialog>
    </>
  )
}
