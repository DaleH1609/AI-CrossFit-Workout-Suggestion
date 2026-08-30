'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from '@phosphor-icons/react'

/**
 * Theme switch.
 *
 * Both destinations are visible at once and a thumb slides between them, so
 * the control shows its state rather than only its next action — the previous
 * icon-only button showed a moon and left you to work out whether that meant
 * "you are in dark mode" or "press for dark mode".
 *
 * role="switch" with aria-checked rather than a bare button: this is a binary
 * on/off, and a switch is what screen readers announce as one. The label says
 * "Dark mode" — the thing being switched — not "toggle theme", which describes
 * the widget instead of the setting.
 *
 * The thumb transition is dropped under prefers-reduced-motion; the colour
 * change alone still communicates the switch.
 */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Reserve the exact footprint pre-hydration so the header does not shift when
  // the real control appears.
  if (!mounted) return <div className="h-7 w-[52px]" aria-hidden="true" />

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={[
        'group relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full',
        'border border-border bg-surface transition-colors duration-200 ease-expo',
        'hover:border-accent/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      ].join(' ')}
    >
      {/* Both icons sit in the track. The inactive one stays dim rather than
          disappearing, so the control reads as a two-position switch. */}
      {/* Above the thumb, not beneath it: the active icon should sit on the
          accent fill — which is what text-on-accent is for — while the
          inactive one stays dim on the track. */}
      <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-between px-[7px]">
        <Sun
          size={12}
          weight="fill"
          aria-hidden="true"
          className={isDark ? 'text-secondary/50' : 'text-on-accent'}
        />
        <Moon
          size={12}
          weight="fill"
          aria-hidden="true"
          className={isDark ? 'text-on-accent' : 'text-secondary/50'}
        />
      </span>

      <span
        aria-hidden="true"
        className={[
          'pointer-events-none relative z-0 ml-[3px] h-[21px] w-[21px] rounded-full bg-accent',
          'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-spring',
          isDark ? 'translate-x-[22px]' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}
