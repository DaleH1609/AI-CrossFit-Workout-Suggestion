# KOVA Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform KOVA from an all-dark app into a light-first, premium product with dark mode toggle, floating WOD cards hero, split auth layout, custom Dropdown component, and full CSS variable token system.

**Architecture:** All colours are defined as CSS custom properties in `globals.css` (light on `:root`, dark on `[data-theme="dark"]`). Tailwind config references these via `var(--color-*)`. `next-themes` controls the `data-theme` attribute on `<html>`. A thin `app/providers.tsx` client wrapper satisfies the RSC boundary. Components migrate from hardcoded dark values and `/opacity` modifiers to the new token classes.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v3, next-themes, inline SVG, CSS keyframe animations

---

## File Map

**New files:**
- `app/providers.tsx` — `'use client'` wrapper for `ThemeProvider`
- `components/ui/theme-toggle.tsx` — sun/moon toggle button
- `components/ui/dropdown.tsx` — custom select replacement
- `components/landing/wod-cards-hero.tsx` — floating WOD cards animation

**Modified — foundation:**
- `app/globals.css` — full CSS variable system, animate-shimmer rename
- `tailwind.config.ts` — all token keys, remove accent-border
- `app/layout.tsx` — wrap with Providers, suppressHydrationWarning, text-foreground
- `app/(auth)/layout.tsx` — strip html/body, return fragment

**Modified — landing:**
- `app/page.tsx` — full rewrite, light background, WodCardsHero, ThemeToggle

**Modified — auth pages:**
- `app/(auth)/login/page.tsx` — split layout
- `app/(auth)/signup/page.tsx` — split layout, Dropdown for timezone
- `app/(auth)/invite/page.tsx` — split layout

**Modified — UI components:**
- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/card.tsx`
- `components/ui/modal.tsx`
- `components/ui/badge.tsx`
- `components/ui/skeleton.tsx`

**Modified — layout components:**
- `components/layout/owner-sidebar.tsx`
- `components/layout/member-nav.tsx`
- `components/layout/sign-out-button.tsx`

**Modified — owner pages:**
- `app/(owner)/layout.tsx`
- `app/(owner)/dashboard/page.tsx`
- `app/(owner)/members/page.tsx`
- `app/(owner)/schedule/page.tsx`
- `app/(owner)/settings/page.tsx`
- `app/(owner)/style-profile/page.tsx`

**Modified — member pages:**
- `app/(member)/layout.tsx`
- `app/(member)/profile/page.tsx`
- `app/(member)/my-schedule/page.tsx`
- `app/(member)/this-week/page.tsx`

**Modified — booking components:**
- `components/booking/class-slot.tsx`
- `components/booking/class-slot-inline.tsx`
- `components/booking/class-tile.tsx`
- `components/booking/week-day-view.tsx`
- `components/booking/cancel-booking-button.tsx`

**Modified — schedule components:**
- `components/schedule/capacity-defaults.tsx`
- `components/schedule/capacity-popover.tsx`
- `components/schedule/class-types-manager.tsx`
- `components/schedule/schedule-grid.tsx`

**Modified — workout components:**
- `components/workout/workout-card.tsx`
- `components/workout/workout-week-grid.tsx`
- `components/workout/workout-edit-modal.tsx`
- `components/workout/scaling-edit-modal.tsx`
- `components/workout/MovementIntelligencePanel.tsx`

---

## Task 1: Foundation — CSS variables, Tailwind config, next-themes

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `app/layout.tsx`
- Create: `app/providers.tsx`
- Modify: `app/(auth)/layout.tsx`

- [ ] **Step 1: Install next-themes**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app
npm install next-themes
```

Expected: `next-themes` appears in `package.json` dependencies.

- [ ] **Step 2: Replace `app/globals.css` entirely**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ─── Light mode (default) ─────────────────────────────────────── */
:root {
  --color-background:    #FAFAF8;
  --color-surface:       #FFFFFF;
  --color-surface-raised:#F3F3F0;
  --color-foreground:    #0A0A0A;
  --color-foreground-70: rgba(10,10,10,0.7);
  --color-foreground-50: rgba(10,10,10,0.5);
  --color-foreground-10: rgba(10,10,10,0.1);
  --color-secondary:     #595F6B;
  --color-accent:        #B8952A;
  --color-accent-5:      rgba(184,149,42,0.05);
  --color-accent-8:      rgba(184,149,42,0.08);
  --color-accent-10:     rgba(184,149,42,0.10);
  --color-accent-15:     rgba(184,149,42,0.15);
  --color-accent-20:     rgba(184,149,42,0.20);
  --color-accent-25:     rgba(184,149,42,0.25);
  --color-accent-30:     rgba(184,149,42,0.30);
  --color-accent-35:     rgba(184,149,42,0.35);
  --color-accent-40:     rgba(184,149,42,0.40);
  --color-accent-50:     rgba(184,149,42,0.50);
  --color-accent-90:     rgba(184,149,42,0.90);
  --color-border:        #E5E5E0;
  --color-danger:        #DC2626;
}

/* ─── Dark mode ─────────────────────────────────────────────────── */
[data-theme="dark"] {
  --color-background:    #0A0A0A;
  --color-surface:       #141414;
  --color-surface-raised:#1A1A1A;
  --color-foreground:    #FFFFFF;
  --color-foreground-70: rgba(255,255,255,0.7);
  --color-foreground-50: rgba(255,255,255,0.5);
  --color-foreground-10: rgba(255,255,255,0.1);
  --color-secondary:     #9CA3AF;
  --color-accent:        #D4AF37;
  --color-accent-5:      rgba(212,175,55,0.05);
  --color-accent-8:      rgba(212,175,55,0.08);
  --color-accent-10:     rgba(212,175,55,0.10);
  --color-accent-15:     rgba(212,175,55,0.15);
  --color-accent-20:     rgba(212,175,55,0.20);
  --color-accent-25:     rgba(212,175,55,0.25);
  --color-accent-30:     rgba(212,175,55,0.30);
  --color-accent-35:     rgba(212,175,55,0.35);
  --color-accent-40:     rgba(212,175,55,0.40);
  --color-accent-50:     rgba(212,175,55,0.50);
  --color-accent-90:     rgba(212,175,55,0.90);
  --color-border:        rgba(255,255,255,0.08);
  --color-danger:        #EF4444;
}

body {
  color: var(--color-foreground);
  background: var(--color-background);
}

@layer utilities {
  .text-balance { text-wrap: balance; }
}

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.animate-shimmer {
  background: linear-gradient(
    90deg,
    var(--color-surface) 25%,
    var(--color-surface-raised) 50%,
    var(--color-surface) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes float-card-a {
  0%, 100% { transform: translateY(0px) rotate(-2deg); }
  50%       { transform: translateY(-8px) rotate(-2deg); }
}
@keyframes float-card-b {
  0%, 100% { transform: translateY(0px) rotate(2deg); }
  50%       { transform: translateY(-6px) rotate(2deg); }
}
.animate-float-a { animation: float-card-a 5s ease-in-out infinite; }
.animate-float-b { animation: float-card-b 6s ease-in-out infinite 1s; }
```

- [ ] **Step 3: Replace `tailwind.config.ts` entirely**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background:       'var(--color-background)',
        surface:          'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        foreground:       'var(--color-foreground)',
        'foreground-70':  'var(--color-foreground-70)',
        'foreground-50':  'var(--color-foreground-50)',
        'foreground-10':  'var(--color-foreground-10)',
        secondary:        'var(--color-secondary)',
        accent:           'var(--color-accent)',
        'accent-5':       'var(--color-accent-5)',
        'accent-8':       'var(--color-accent-8)',
        'accent-10':      'var(--color-accent-10)',
        'accent-15':      'var(--color-accent-15)',
        'accent-20':      'var(--color-accent-20)',
        'accent-25':      'var(--color-accent-25)',
        'accent-30':      'var(--color-accent-30)',
        'accent-35':      'var(--color-accent-35)',
        'accent-40':      'var(--color-accent-40)',
        'accent-50':      'var(--color-accent-50)',
        'accent-90':      'var(--color-accent-90)',
        border:           'var(--color-border)',
        danger:           'var(--color-danger)',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body:    ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        btn:  '4px',
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 4: Create `app/providers.tsx`**

```tsx
'use client'
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
      {children}
    </ThemeProvider>
  )
}
```

- [ ] **Step 5: Update `app/layout.tsx`**

Replace the entire file:

```tsx
import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: { default: 'KOVA', template: '%s | KOVA' },
  description: 'AI-powered gym programming for CrossFit and Hyrox gyms. Generate weekly WODs in seconds.',
  keywords: ['CrossFit programming', 'Hyrox training', 'gym management', 'WOD generator'],
  openGraph: {
    title: 'KOVA — Train Smarter. Perform Better.',
    description: 'AI-powered gym programming for CrossFit and Hyrox gyms.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="bg-background text-foreground font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

> **Note:** The `inter` and `playfair` font config lines use `Inter` and `Playfair_Display` from `next/font/google` — adjust the import line: `import { Inter, Playfair_Display } from 'next/font/google'` and use `Inter({ subsets: ['latin'], variable: '--font-inter' })` for inter.

- [ ] **Step 6: Fix `app/(auth)/layout.tsx`** — strip nested html/body

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 7: Verify foundation**

```bash
npm run dev
```

Open `http://localhost:3000`. The page background should be off-white (`#FAFAF8`). Open browser devtools, run `document.documentElement.setAttribute('data-theme','dark')` in console — background should switch to `#0A0A0A`. Confirm no hydration warning in console.

- [ ] **Step 8: Commit**

```bash
git add app/globals.css tailwind.config.ts app/layout.tsx app/providers.tsx app/(auth)/layout.tsx package.json package-lock.json
git commit -m "feat: add CSS variable token system and next-themes dark/light mode"
```

---

## Task 2: ThemeToggle and Dropdown components

**Files:**
- Create: `components/ui/theme-toggle.tsx`
- Create: `components/ui/dropdown.tsx`

- [ ] **Step 1: Create `components/ui/theme-toggle.tsx`**

```tsx
'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-btn text-secondary hover:text-foreground transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        /* Sun icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <line x1="12" y1="2" x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="4.22" y1="4.22" x2="7.05" y2="7.05"/>
          <line x1="16.95" y1="16.95" x2="19.78" y2="19.78"/>
          <line x1="2" y1="12" x2="6" y2="12"/>
          <line x1="18" y1="12" x2="22" y2="12"/>
          <line x1="4.22" y1="19.78" x2="7.05" y2="16.95"/>
          <line x1="16.95" y1="7.05" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* Moon icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Create `components/ui/dropdown.tsx`**

```tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DropdownProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; description?: string }[]
  placeholder?: string
  className?: string
}

export function Dropdown({ value, onChange, options, placeholder = 'Select…', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) } return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, options.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); onChange(options[focused].value); setOpen(false) }
    if (e.key === 'Escape')    { setOpen(false) }
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'text-foreground' : 'text-foreground-50'}>{selected?.label ?? placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="2 4 6 8 10 4"/>
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg
            opacity-100 translate-y-0 scale-100"
          style={{ transformOrigin: 'top' }}
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onMouseEnter={() => setFocused(i)}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                'flex items-start justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors text-sm',
                i === focused ? 'bg-surface-raised' : '',
                opt.value === value ? 'text-accent' : 'text-foreground'
              )}
            >
              <div>
                <div className="font-medium">{opt.label}</div>
                {opt.description && <div className="text-xs text-secondary mt-0.5">{opt.description}</div>}
              </div>
              {opt.value === value && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent mt-0.5 shrink-0">
                  <polyline points="2 7 6 11 12 3"/>
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify components compile**

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors in the two new files.

- [ ] **Step 4: Commit**

```bash
git add components/ui/theme-toggle.tsx components/ui/dropdown.tsx
git commit -m "feat: add ThemeToggle and Dropdown UI components"
```

---

## Task 3: WodCardsHero component

**Files:**
- Create: `components/landing/wod-cards-hero.tsx` (also creates `components/landing/` directory)

- [ ] **Step 1: Create `components/landing/wod-cards-hero.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'

export function WodCardsHero() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative h-[380px] flex items-center justify-center select-none">
      {/* Secondary card — behind, slightly offset */}
      <div
        className={`absolute w-72 bg-surface border border-border shadow rounded-xl p-4 transition-opacity duration-500
          ${visible ? 'opacity-60 animate-float-b' : 'opacity-0'}`}
        style={{ transform: 'rotate(2deg)', top: '14%', left: '12%', transitionDelay: '150ms' }}
      >
        <p className="text-xs font-semibold tracking-widest text-secondary uppercase mb-1">Tuesday — Metcon</p>
        <p className="text-sm text-foreground font-medium">For Time: 21-15-9</p>
        <p className="text-xs text-secondary mt-1">Thrusters / Pull-ups</p>
      </div>

      {/* Primary card — foreground */}
      <div
        className={`relative w-72 bg-surface border border-border shadow-lg rounded-xl p-5 transition-opacity duration-500
          ${visible ? 'opacity-100 animate-float-a' : 'opacity-0'}`}
        style={{ transform: 'rotate(-2deg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold tracking-widest text-accent uppercase">Monday — Strength</span>
          <span className="w-2 h-2 rounded-full bg-accent block" />
        </div>

        {/* Main movement */}
        <p className="text-base font-bold text-foreground mb-0.5">Back Squat 5×5</p>
        <p className="text-xs text-secondary mb-3">@ 80% 1RM — 3 min rest</p>

        <div className="border-t border-border mb-3" />

        {/* Metcon */}
        <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-2">AMRAP 15 MIN</p>
        <ul className="space-y-1">
          {['10 Pull-ups', '15 Box Jumps (24/20")', '20 KB Swings (24/16 kg)'].map(m => (
            <li key={m} className="text-sm text-secondary">· {m}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/landing/wod-cards-hero.tsx
git commit -m "feat: add WodCardsHero floating cards component"
```

---

## Task 4: Rebuild landing page

**Files:**
- Modify: `app/page.tsx`

The current `app/page.tsx` uses inline dark styles. Replace entirely with a light-first Tailwind-based layout. The landing page itself stays always light (no `data-theme` on the landing — `ThemeToggle` only affects app interior, but we add it to nav anyway for consistency).

- [ ] **Step 1: Replace `app/page.tsx` entirely**

```tsx
import Link from 'next/link'
import { KovaLogo } from '@/components/ui/kova-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { WodCardsHero } from '@/components/landing/wod-cards-hero'

export default function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-screen font-body">

      {/* NAV — bg-background/90 won't work with CSS vars in Tailwind v3; use inline style for opacity */}
      <nav className="sticky top-0 z-50 h-16 backdrop-blur-md border-b border-border"
        style={{ background: 'color-mix(in srgb, var(--color-background) 90%, transparent)' }}>
        <div className="max-w-6xl mx-auto px-8 h-full flex items-center justify-between">
          <KovaLogo size="lg" />
          <div className="flex items-center gap-8">
            <a href="#features" className="hidden md:block text-sm text-secondary hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hidden md:block text-sm text-secondary hover:text-foreground transition-colors">How It Works</a>
            <ThemeToggle />
            <Link
              href="/login"
              className="bg-accent text-background px-5 py-2 text-xs font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-5">AI-Powered Gym Programming</p>
          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-foreground mb-5">
            Train Smarter.<br />
            <span className="text-accent">Perform Better.</span>
          </h1>
          <p className="text-base text-secondary leading-relaxed max-w-md mb-9">
            KOVA generates weekly programs tailored to your gym&apos;s coaching style — so you spend less time programming and more time coaching.
          </p>
          <div className="flex items-center gap-5 mb-12">
            <Link
              href="/signup"
              className="bg-accent text-background px-7 py-3 text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors"
            >
              Create Your Gym
            </Link>
            <Link href="/login" className="text-sm text-secondary border-b border-secondary/40 pb-px hover:text-foreground transition-colors">
              Sign in →
            </Link>
          </div>
          <div className="flex gap-8 pt-8 border-t border-border">
            {[
              { value: '500+', label: 'Gyms' },
              { value: '10K+', label: 'Members' },
              { value: '50K+', label: 'WODs Generated' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-xl font-bold text-accent">{s.value}</div>
                <div className="text-xs text-secondary tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <WodCardsHero />
      </section>

      {/* STATS BAR */}
      <div className="border-y border-border bg-surface-raised">
        <div className="max-w-6xl mx-auto px-8 py-6 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
          {[
            { value: '< 30s', label: 'To generate a full week' },
            { value: 'CrossFit + Hyrox', label: 'Supported gym types' },
            { value: 'Rx / Scaled / Beginner', label: 'Auto-scaled for every athlete' },
          ].map((item, i) => (
            <div key={item.label} className="flex items-center gap-16">
              {i > 0 && <div className="hidden sm:block w-px h-8 bg-border" />}
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{item.value}</div>
                <div className="text-xs text-secondary tracking-wide mt-0.5">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-8 py-24 scroll-mt-16">
        <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-4">The process</p>
        <h2 className="font-display text-4xl font-bold text-foreground tracking-tight mb-14">
          From idea to published<br />
          <span className="text-accent">in three steps.</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
          {[
            { num: '01', title: 'Generate', desc: "Tell KOVA your gym type and coaching style. The AI generates a full week of structured WODs in under 30 seconds." },
            { num: '02', title: 'Review & Edit', desc: "Every workout is editable before it goes live. Swap movements, adjust loads, add coaching notes. Your program, refined by AI." },
            { num: '03', title: 'Publish', desc: "Approve the week and your members instantly see it. Auto-scaled versions for Rx, Scaled, and Beginner generated automatically." },
          ].map(step => (
            <div key={step.num} className="bg-surface p-10">
              <div className="text-6xl font-black text-border leading-none mb-5">{step.num}</div>
              <h3 className="text-lg font-bold text-foreground mb-3">{step.title}</h3>
              <p className="text-sm text-secondary leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-8 py-24 scroll-mt-16">
        <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-4">What KOVA does</p>
        <h2 className="font-display text-4xl font-bold text-foreground tracking-tight mb-14">
          Everything your gym needs.<br />
          <span className="text-accent">Nothing it doesn&apos;t.</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {[
            { title: 'AI Workout Generation', desc: "Generate a full week of WODs in seconds. KOVA learns your gym's style and keeps programming consistent." },
            { title: 'Class Scheduling', desc: 'Set up recurring class slots, manage capacity, and let members book directly from their phone.' },
            { title: 'Member Management', desc: "Invite members, track attendance, and manage your gym community — all in one place." },
            { title: 'Auto-Scaling', desc: 'Every WOD automatically scaled to Rx, Scaled, and Beginner. No more writing three versions.' },
            { title: 'CrossFit & Hyrox', desc: "Built-in programming logic for both gym types. Switch in settings — the AI adapts instantly." },
            { title: 'Full Edit Control', desc: 'AI generates, you approve. Edit any workout before publishing — structured editor or free text.' },
          ].map(f => (
            <div key={f.title} className="bg-surface p-8 hover:bg-surface-raised transition-colors group">
              <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-accent transition-colors">{f.title}</h3>
              <p className="text-sm text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0A0A0A] py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.08) 0%, transparent 65%)' }} />
        <div className="relative">
          <h2 className="font-display text-5xl font-bold text-white tracking-tight mb-4">
            Ready to elevate<br />
            <span className="text-accent">your gym?</span>
          </h2>
          <p className="text-secondary text-base mb-10">Join gym owners already using KOVA to program smarter.</p>
          <Link
            href="/signup"
            className="inline-block bg-accent text-black px-11 py-4 text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors"
            style={{ boxShadow: '0 12px 40px rgba(212,175,55,0.35)' }}
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0A0A0A] border-t border-white/5 px-8 py-7 flex items-center justify-between">
        <KovaLogo size="sm" />
        <span className="text-xs text-secondary">© 2026 KOVA. All rights reserved.</span>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000`. Check:
- Page is light (off-white background)
- Two floating WOD cards visible on right
- Nav has ThemeToggle moon icon
- Clicking ThemeToggle switches page to dark

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: rebuild landing page with light theme and floating WOD cards hero"
```

---

## Task 5: Auth pages — split layout

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/signup/page.tsx`
- Modify: `app/(auth)/invite/page.tsx`

All three pages get the same split layout shell: dark brand panel left (`hidden lg:flex w-3/5`), form panel right (`flex-1 bg-surface`). The auth logic (state, handlers) is unchanged.

- [ ] **Step 1: Replace `app/(auth)/login/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KovaLogo } from '@/components/ui/kova-logo'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex w-3/5 flex-col justify-between p-12"
        style={{ background: '#050508', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 30% 40%, rgba(212,175,55,0.12) 0%, transparent 60%)',
        }} />
        <KovaLogo size="md" />
        <div className="relative">
          <p className="font-display text-4xl font-bold text-white leading-snug mb-4">
            Your program,<br />refined by AI.
          </p>
          <p className="text-sm text-white/50">Trusted by 500+ gyms worldwide.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 bg-surface flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center"><KovaLogo size="md" /></div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-8">Welcome back</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email" required
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
            />
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" required
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
            />
            {error && <p className="text-danger text-sm">{error}</p>}
            <button type="submit"
              className="w-full py-2.5 bg-accent text-background text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors">
              Sign In
            </button>
          </form>
          <p className="mt-6 text-secondary text-sm text-center">
            New gym? <Link href="/signup" className="text-accent hover:underline">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace `app/(auth)/signup/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KovaLogo } from '@/components/ui/kova-logo'
import { Dropdown } from '@/components/ui/dropdown'
import Link from 'next/link'

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York',   label: 'Eastern Time (ET)' },
  { value: 'America/Chicago',    label: 'Central Time (CT)' },
  { value: 'America/Denver',     label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles',label: 'Pacific Time (PT)' },
  { value: 'Europe/London',      label: 'London (GMT/BST)' },
  { value: 'Australia/Sydney',   label: 'Sydney (AEST)' },
]

const GYM_TYPES = [
  { value: 'crossfit', label: 'CrossFit', description: 'Classic WODs, strength work, and functional fitness' },
  { value: 'hyrox',    label: 'Hyrox',    description: 'Race-format training with ski erg, sleds, and functional stations' },
]

export default function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '', gymName: '', timezone: 'America/New_York', gymType: 'crossfit' as 'crossfit' | 'hyrox' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      router.push('/login')
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-3/5 flex-col justify-between p-12"
        style={{ background: '#050508', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 30% 40%, rgba(212,175,55,0.12) 0%, transparent 60%)',
        }} />
        <KovaLogo size="md" />
        <div className="relative">
          <p className="font-display text-4xl font-bold text-white leading-snug mb-4">
            Your program,<br />refined by AI.
          </p>
          <p className="text-sm text-white/50">Trusted by 500+ gyms worldwide.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 bg-surface flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center"><KovaLogo size="md" /></div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-8">Create your gym</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={form.gymName}
              onChange={e => setForm(f => ({ ...f, gymName: e.target.value }))}
              placeholder="Gym Name" required
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
            />
            <input type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Email" required
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
            />
            <input type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Password" required
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
            />

            <Dropdown
              value={form.timezone}
              onChange={tz => setForm(f => ({ ...f, timezone: tz }))}
              options={TIMEZONE_OPTIONS}
              placeholder="Select timezone"
            />

            <div>
              <p className="text-xs text-secondary uppercase tracking-wider mb-2">Gym Type</p>
              <div className="space-y-2">
                {GYM_TYPES.map(({ value, label, description }) => (
                  <label key={value}
                    className={`flex items-start gap-3 p-3 rounded-btn border cursor-pointer transition-colors ${form.gymType === value ? 'border-accent bg-accent-10' : 'border-border bg-background'}`}>
                    <input type="radio" name="gymType" value={value} checked={form.gymType === value}
                      onChange={() => setForm(f => ({ ...f, gymType: value as 'crossfit' | 'hyrox' }))}
                      className="mt-0.5 accent-accent" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-secondary">{description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-accent text-background text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50">
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
          <p className="mt-6 text-secondary text-sm text-center">
            Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace `app/(auth)/invite/page.tsx`**

Keep all existing auth logic unchanged. Only update the layout and class tokens:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { KovaLogo } from '@/components/ui/kova-logo'

export default function InvitePage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const params = new URLSearchParams(hash.replace('#', ''))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) { router.replace('/login?error=invite_failed'); return }
        window.history.replaceState(null, '', window.location.pathname)
        setSessionReady(true)
      })
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.replace('/login?error=invite_failed'); return }
        setSessionReady(true)
      })
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); return }
    window.location.href = '/this-week'
  }

  if (!sessionReady) return null

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-3/5 flex-col justify-between p-12"
        style={{ background: '#050508', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 30% 40%, rgba(212,175,55,0.12) 0%, transparent 60%)',
        }} />
        <KovaLogo size="md" />
        <div className="relative">
          <p className="font-display text-4xl font-bold text-white leading-snug mb-4">
            Your program,<br />refined by AI.
          </p>
          <p className="text-sm text-white/50">Trusted by 500+ gyms worldwide.</p>
        </div>
      </div>
      <div className="flex-1 bg-surface flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center"><KovaLogo size="md" /></div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Set Your Password</h1>
          <p className="text-secondary text-sm mb-8">Welcome! Set a password to access your gym.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password" minLength={8} required
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors"
            />
            {error && <p className="text-danger text-sm">{error}</p>}
            <button type="submit"
              className="w-full py-2.5 bg-accent text-background text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors">
              Set Password &amp; Enter
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/login`. Check:
- Dark brand panel visible on left (desktop)
- Light form panel on right
- Inputs use light background
- Panel hidden on mobile (resize to < 1024px)

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/login/page.tsx app/(auth)/signup/page.tsx app/(auth)/invite/page.tsx
git commit -m "feat: split auth layout with dark brand panel and Dropdown component"
```

---

## Task 6: Core UI component token migration

**Files:**
- Modify: `components/ui/button.tsx`
- Modify: `components/ui/input.tsx`
- Modify: `components/ui/card.tsx`
- Modify: `components/ui/modal.tsx`
- Modify: `components/ui/badge.tsx`
- Modify: `components/ui/skeleton.tsx`

- [ ] **Step 1: Update `components/ui/button.tsx`**

Change:
- `text-white` → `text-foreground` (primary variant)
- `hover:text-white` → `hover:text-foreground` (ghost variant)

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'px-4 py-2 rounded-btn text-sm font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && 'border border-accent text-foreground hover:bg-accent hover:text-background',
        variant === 'danger'  && 'border border-danger text-danger hover:bg-danger hover:text-foreground',
        variant === 'ghost'   && 'text-secondary hover:text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
Button.displayName = 'Button'
```

- [ ] **Step 2: Update `components/ui/input.tsx`**

Replace hardcoded dark values with CSS-variable tokens:

```tsx
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {label && (
          <label htmlFor={id} className="text-xs tracking-widest text-secondary uppercase font-semibold">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full bg-surface border border-border text-foreground px-3 py-2 text-sm rounded-btn focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'
```

- [ ] **Step 3: Update `components/ui/card.tsx`**

`border-accent-border` → `border-border`:

```tsx
import { cn } from '@/lib/utils'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-surface border border-border rounded-card p-4', className)}>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Update `components/ui/modal.tsx`**

`border-accent-border` → `border-border`, `text-white` → `text-foreground`:

```tsx
'use client'
import { useEffect } from 'react'
import { Button } from './button'

interface ModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export function Modal({ open, title, description, confirmLabel = 'Confirm', confirmVariant = 'primary', onConfirm, onCancel }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc" className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative bg-surface border border-border rounded-card p-6 max-w-md w-full mx-4">
        <h2 id="modal-title" className="font-display text-xl text-foreground mb-2">{title}</h2>
        <p id="modal-desc" className="text-secondary text-sm mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Update `components/ui/badge.tsx`**

`bg-accent/20` → `bg-accent-20`, `bg-white/10` → `bg-foreground-10`:

```tsx
import { cn } from '@/lib/utils'

type BadgeVariant = 'draft' | 'published' | 'confirmed' | 'waitlisted' | 'pending_confirmation'

const variants: Record<BadgeVariant, string> = {
  draft:                'bg-foreground-10 text-secondary',
  published:            'bg-accent-20 text-accent',
  confirmed:            'bg-green-500/20 text-green-400',
  waitlisted:           'bg-foreground-10 text-secondary',
  pending_confirmation: 'bg-yellow-500/20 text-yellow-400',
}

export function Badge({ variant, label }: { variant: BadgeVariant; label: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant])}>
      {label}
    </span>
  )
}
```

- [ ] **Step 6: Update `components/ui/skeleton.tsx`**

`animate-pulse` → `animate-shimmer`, `bg-white/5` → `bg-foreground-10`:

```tsx
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-shimmer bg-foreground-10 rounded-card', className)} />
  )
}
```

- [ ] **Step 7: Verify**

```bash
npm run dev
```

Open the owner dashboard (if logged in) or just check `http://localhost:3000`. No broken styles in browser console.

- [ ] **Step 8: Commit**

```bash
git add components/ui/button.tsx components/ui/input.tsx components/ui/card.tsx components/ui/modal.tsx components/ui/badge.tsx components/ui/skeleton.tsx
git commit -m "feat: migrate core UI components to CSS variable token system"
```

---

## Task 7: Layout components migration

**Files:**
- Modify: `components/layout/owner-sidebar.tsx`
- Modify: `components/layout/member-nav.tsx`
- Modify: `components/layout/sign-out-button.tsx`
- Modify: `app/(owner)/layout.tsx`
- Modify: `app/(member)/layout.tsx`

- [ ] **Step 1: Update `components/layout/owner-sidebar.tsx`**

Replacements:
- `border-accent-border` → `border-border`
- `bg-accent/10` → `bg-accent-10`
- `hover:text-white` → `hover:text-foreground`
- `text-white` → `text-foreground`

```tsx
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
```

- [ ] **Step 2: Read `components/layout/member-nav.tsx` and `components/layout/sign-out-button.tsx`**

Read both files, then apply the same token replacements:
- `accent-border` → `border`
- `text-white` → `text-foreground`
- `hover:text-white` → `hover:text-foreground`
- `bg-accent/10` → `bg-accent-10`

> Read the files first before editing. Apply only the class token replacements — do not change logic.

- [ ] **Step 3: Read and update `app/(owner)/layout.tsx`**

Read the file. Add `<ThemeToggle />` import and placement in the header. Apply token replacements (`accent-border` → `border`, `text-white` → `text-foreground`).

- [ ] **Step 4: Read and update `app/(member)/layout.tsx`**

Same as owner layout — add `<ThemeToggle />`, apply token replacements.

- [ ] **Step 5: Commit**

```bash
git add components/layout/ app/(owner)/layout.tsx app/(member)/layout.tsx
git commit -m "feat: migrate layout components to token system, add ThemeToggle to app headers"
```

---

## Task 8: Owner app pages token migration

**Files:**
- Modify: `app/(owner)/dashboard/page.tsx`
- Modify: `app/(owner)/members/page.tsx`
- Modify: `app/(owner)/schedule/page.tsx`
- Modify: `app/(owner)/settings/page.tsx`
- Modify: `app/(owner)/style-profile/page.tsx`

- [ ] **Step 1: For each file, read then apply replacements**

Apply these to every owner page. Read each file before editing.

Replacement table (apply all that appear in each file):
| Old | New |
|-----|-----|
| `text-white` | `text-foreground` |
| `hover:text-white` | `hover:text-foreground` |
| `text-white/70` | `text-foreground-70` |
| `text-white/50` | `text-foreground-50` |
| `text-white/90` | `text-foreground` |
| `border-accent-border` | `border-border` |
| `bg-accent-border` | `bg-border` |
| `bg-accent/10` | `bg-accent-10` |
| `bg-accent/20` | `bg-accent-20` |
| `border-accent/20` | `border-accent-20` |
| `border-accent/30` | `border-accent-30` |
| `border-accent/40` | `border-accent-40` |

Additionally for `app/(owner)/settings/page.tsx`: replace any `<select>` timezone or cutoff dropdowns with `<Dropdown>` from `@/components/ui/dropdown`.

- [ ] **Step 2: Verify each page loads without errors**

```bash
npm run dev
```

Log in as an owner and click through Dashboard, Members, Schedule, Settings, Style Profile. Check no broken white-on-white or invisible text.

- [ ] **Step 3: Commit**

```bash
git add app/(owner)/
git commit -m "feat: migrate owner pages to CSS variable token system"
```

---

## Task 9: Member pages and booking components

**Files:**
- Modify: `app/(member)/this-week/page.tsx`
- Modify: `app/(member)/my-schedule/page.tsx`
- Modify: `app/(member)/profile/page.tsx`
- Modify: `components/booking/class-slot.tsx`
- Modify: `components/booking/class-slot-inline.tsx`
- Modify: `components/booking/class-tile.tsx`
- Modify: `components/booking/week-day-view.tsx`
- Modify: `components/booking/cancel-booking-button.tsx`

- [ ] **Step 1: Read and update member pages**

Apply the same replacement table from Task 8 to all three member pages. Read each file first.

- [ ] **Step 2: Update `components/booking/class-slot.tsx`**

Specific replacements:
- `border-accent-border` → `border-border`
- `bg-accent/10` → `bg-accent-10`
- `border-accent/30` → `border-accent-30`
- `hover:bg-accent/20` → `hover:bg-accent-20`
- `text-white` → `text-foreground` (the `text-white font-semibold` on time display)

- [ ] **Step 3: Read and update remaining booking components**

For `class-slot-inline.tsx`: `border-accent/40` → `border-accent-40`, `hover:bg-accent/10` → `hover:bg-accent-10`, `text-white` → `text-foreground`.

For `cancel-booking-button.tsx`: `accent-border` → `border`.

Read `class-tile.tsx` and `week-day-view.tsx` then apply the full replacement table.

- [ ] **Step 4: Commit**

```bash
git add app/(member)/ components/booking/
git commit -m "feat: migrate member pages and booking components to token system"
```

---

## Task 10: Schedule and workout components

**Files:**
- Modify: `components/schedule/capacity-defaults.tsx`
- Modify: `components/schedule/capacity-popover.tsx`
- Modify: `components/schedule/class-types-manager.tsx`
- Modify: `components/schedule/schedule-grid.tsx`
- Modify: `components/workout/workout-card.tsx`
- Modify: `components/workout/workout-week-grid.tsx`
- Modify: `components/workout/workout-edit-modal.tsx`
- Modify: `components/workout/scaling-edit-modal.tsx`
- Modify: `components/workout/MovementIntelligencePanel.tsx`

- [ ] **Step 1: Update `components/schedule/capacity-defaults.tsx`**

This file has hardcoded Tailwind dark tokens not in the system. Read the file then replace:
- `bg-zinc-800` → `bg-surface`
- `border-zinc-600` → `border-border`
- `border-zinc-700` → `border-border`
- `focus:border-yellow-500` → `focus:border-accent`
- `text-yellow-400` → `text-accent`
- `text-yellow-600` → `text-accent` (border colour)
- `text-gray-400` → `text-secondary`
- `text-gray-500` → `text-secondary`
- `text-white` → `text-foreground`

- [ ] **Step 2: Update remaining schedule components**

Read each file then apply the full replacement table:
- `capacity-popover.tsx`: `accent-border` → `border`, `hover:bg-accent/90` → `hover:bg-accent-90`, `text-white` → `text-foreground`
- `class-types-manager.tsx` and `schedule-grid.tsx`: apply full replacement table

- [ ] **Step 3: Update workout components**

Read each file then apply:
- `workout-card.tsx`: `accent-border` → `border`, `text-white/70` → `text-foreground-70`, `text-white/90` → `text-foreground`, `text-white` → `text-foreground`
- `workout-week-grid.tsx`: `accent-border` → `border`, `hover:bg-accent/10` → `hover:bg-accent-10`
- `workout-edit-modal.tsx` and `scaling-edit-modal.tsx`: full replacement table
- `MovementIntelligencePanel.tsx`: `accent-border` → `border`, `animate-pulse` → `animate-shimmer`, `text-white` → `text-foreground`

- [ ] **Step 4: Final visual check**

```bash
npm run dev
```

Log in as an owner. Check:
- Dashboard workout cards render correctly
- Schedule grid has no broken colours
- Capacity defaults inputs are visible

Toggle dark mode with the ThemeToggle in the sidebar. Check app interior responds correctly in dark mode.

- [ ] **Step 5: Commit**

```bash
git add components/schedule/ components/workout/
git commit -m "feat: migrate schedule and workout components to token system"
```

---

## Verification checklist (all tasks complete)

Run dev server and confirm:

- [ ] Light mode is default — background is off-white, not black
- [ ] Dark mode toggle switches entire app to dark theme
- [ ] Landing page hero shows two floating WOD cards on a light background
- [ ] Login/signup pages show dark brand panel on left, light form on right
- [ ] Signup timezone field uses the Dropdown component (no native `<select>`)
- [ ] Owner sidebar nav, cards, modals all readable in both light and dark
- [ ] Skeleton loading states shimmer correctly in both modes
- [ ] No `accent-border` Tailwind class errors in browser console
- [ ] No `bg-white/5` or `bg-accent/10` opacity modifier classes remain (they silently produce transparent backgrounds)

