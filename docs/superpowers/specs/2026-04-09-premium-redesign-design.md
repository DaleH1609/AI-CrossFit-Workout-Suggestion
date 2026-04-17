# KOVA Premium Redesign — Design Spec

## Goal

Transform KOVA from a functional but basic-looking dark app into a premium, light-first product with dark mode support, a distinctive landing page with floating WOD cards in the hero, a split-panel auth layout, a custom dropdown component, and a consistent typography system throughout.

---

## 1. Colour System

### CSS Variable Strategy

All colour tokens are defined as CSS variables on `:root` (light) and `[data-theme="dark"]` (dark). Tailwind's config is updated so every colour token references `var(--color-*)`. The existing `--background` / `--foreground` variable names in `globals.css` are **replaced** with the new `--color-*` names. The existing `body` rule must be updated:
```css
/* OLD */
body { color: var(--foreground); background: var(--background); }
/* NEW */
body { color: var(--color-foreground); background: var(--color-background); }
```

### Light Mode (`:root` — new default)

| CSS Variable | Value | Tailwind key |
|---|---|---|
| `--color-background` | `#FAFAF8` | `background` |
| `--color-surface` | `#FFFFFF` | `surface` |
| `--color-surface-raised` | `#F3F3F0` | `surface-raised` |
| `--color-foreground` | `#0A0A0A` | `foreground` |
| `--color-foreground-70` | `rgba(10,10,10,0.7)` | `foreground-70` |
| `--color-foreground-50` | `rgba(10,10,10,0.5)` | `foreground-50` |
| `--color-foreground-10` | `rgba(10,10,10,0.1)` | `foreground-10` |
| `--color-secondary` | `#595F6B` | `secondary` (passes WCAG AA 4.5:1 on light bg) |
| `--color-accent` | `#B8952A` | `accent` |
| `--color-accent-5` | `rgba(184,149,42,0.05)` | `accent-5` |
| `--color-accent-8` | `rgba(184,149,42,0.08)` | `accent-8` |
| `--color-accent-10` | `rgba(184,149,42,0.10)` | `accent-10` |
| `--color-accent-15` | `rgba(184,149,42,0.15)` | `accent-15` |
| `--color-accent-20` | `rgba(184,149,42,0.20)` | `accent-20` |
| `--color-accent-25` | `rgba(184,149,42,0.25)` | `accent-25` |
| `--color-accent-30` | `rgba(184,149,42,0.30)` | `accent-30` |
| `--color-accent-35` | `rgba(184,149,42,0.35)` | `accent-35` |
| `--color-accent-40` | `rgba(184,149,42,0.40)` | `accent-40` |
| `--color-accent-50` | `rgba(184,149,42,0.50)` | `accent-50` |
| `--color-accent-90` | `rgba(184,149,42,0.90)` | `accent-90` |
| `--color-border` | `#E5E5E0` | `border` |
| `--color-danger` | `#DC2626` | `danger` |

### Dark Mode (`[data-theme="dark"]`)

| CSS Variable | Value |
|---|---|
| `--color-background` | `#0A0A0A` |
| `--color-surface` | `#141414` |
| `--color-surface-raised` | `#1A1A1A` |
| `--color-foreground` | `#FFFFFF` |
| `--color-foreground-70` | `rgba(255,255,255,0.7)` |
| `--color-foreground-50` | `rgba(255,255,255,0.5)` |
| `--color-foreground-10` | `rgba(255,255,255,0.1)` |
| `--color-secondary` | `#9CA3AF` |
| `--color-accent` | `#D4AF37` |
| `--color-accent-5` | `rgba(212,175,55,0.05)` |
| `--color-accent-8` | `rgba(212,175,55,0.08)` |
| `--color-accent-10` | `rgba(212,175,55,0.10)` |
| `--color-accent-15` | `rgba(212,175,55,0.15)` |
| `--color-accent-20` | `rgba(212,175,55,0.20)` |
| `--color-accent-25` | `rgba(212,175,55,0.25)` |
| `--color-accent-30` | `rgba(212,175,55,0.30)` |
| `--color-accent-35` | `rgba(212,175,55,0.35)` |
| `--color-accent-40` | `rgba(212,175,55,0.40)` |
| `--color-accent-50` | `rgba(212,175,55,0.50)` |
| `--color-accent-90` | `rgba(212,175,55,0.90)` |
| `--color-border` | `rgba(255,255,255,0.08)` |
| `--color-danger` | `#EF4444` |

### `tailwind.config.ts` — full updated `colors` block

```ts
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
}
```

**`accent-border` is intentionally removed** from the config. All `accent-border` usages are replaced with `border`. The accent opacity variants (`accent-5` through `accent-90`) replace all `/opacity` modifier usages on `accent`.

### Opacity modifier replacement table

| Old class | Replacement |
|---|---|
| `bg-accent/5` | `bg-accent-5` |
| `bg-accent/8` | `bg-accent-8` |
| `bg-accent/10` | `bg-accent-10` |
| `bg-accent/15` | `bg-accent-15` |
| `bg-accent/20` | `bg-accent-20` |
| `border-accent/20` | `border-accent-20` |
| `border-accent/25` | `border-accent-25` |
| `border-accent/30` | `border-accent-30` |
| `border-accent/40` | `border-accent-40` |
| `border-accent/50` | `border-accent-50` |
| `hover:bg-accent/8` | `hover:bg-accent-8` |
| `hover:bg-accent/10` | `hover:bg-accent-10` |
| `hover:bg-accent/20` | `hover:bg-accent-20` |
| `hover:bg-accent/90` | `hover:bg-accent-90` |
| `hover:border-accent/35` | `hover:border-accent-35` |
| `hover:border-accent/40` | `hover:border-accent-40` |
| `bg-accent/40` | `bg-accent-40` |
| `text-white/70` | `text-foreground-70` |
| `text-white/50` | `text-foreground-50` |
| `text-white/90` | `text-foreground` |
| `hover:text-white` | `hover:text-foreground` |
| `text-white` (app interior) | `text-foreground` |
| `bg-white/10` | `bg-foreground-10` |
| `border-accent-border` | `border-border` |
| `bg-accent-border` | `bg-border` |

### `next-themes` Configuration

Install: `npm install next-themes`

Create `app/providers.tsx` — a thin client wrapper (required because `ThemeProvider` uses hooks and cannot be used directly in a Server Component):

```tsx
// app/providers.tsx
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

In `app/layout.tsx` (remains a Server Component):
```tsx
import { Providers } from './providers'

// On the existing <html> element, add suppressHydrationWarning alongside existing lang and className:
// <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>

<body ...>
  <Providers>
    {children}
  </Providers>
</body>
```

- `attribute="data-theme"` — sets `data-theme="dark"` on `<html>`, matching `[data-theme="dark"]` CSS selector
- `suppressHydrationWarning` on the `<html>` element prevents theme-class mismatch warning

---

## 2. Typography System

### Fonts (already installed via `next/font/google`)
- **Display**: Playfair Display (`font-display`) — hero h1, section titles, auth headlines
- **Body / UI**: Inter (`font-body`) — all body text, labels, inputs, buttons

### Scale
| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Labels, badges, timestamps |
| `text-sm` | 14px | Body, inputs, nav links |
| `text-base` | 16px | Lead paragraphs |
| `text-xl` | 20px | Card headings |
| `text-2xl` | 24px | Page headings (app interior) |
| `text-3xl` | 30px | Section titles (landing) |
| `text-5xl` | 48px | Hero headline |

### Label convention
`text-xs font-semibold tracking-widest text-secondary uppercase`

### `text-white` migration
See the opacity replacement table in Section 1. Apply to all app interior files listed in Section 8. **Landing page (`app/page.tsx`) is excluded — always dark.**

`app/layout.tsx` `<body>` tag: `text-white` → `text-foreground`

---

## 3. Landing Page

`app/page.tsx` — **Server Component** (no `'use client'`). `WodCardsHero` is the only client import.

### Nav
- `sticky top-0 z-50 backdrop-blur-md`
- Light: `bg-white/90 border-b border-border`; Dark: `bg-[#060608]/90 border-b border-[rgba(255,255,255,0.06)]`
- Left: `KovaLogo` | Centre: Features / How It Works links | Right: `ThemeToggle` + Sign In

### Hero (two columns)

**Left column:**
- Gold eyebrow label, H1 Playfair Display `text-5xl font-bold`
- Lead paragraph `text-base text-secondary`
- CTA: gold "Create Your Gym" + ghost "Sign in →"
- Stats: 500+ Gyms / 10K+ Members / 50K+ WODs

**Right column — `<WodCardsHero />` client component:**
- Background: `bg-surface-raised` (adapts to light/dark theme)
- Two stacked WOD cards floating with CSS keyframe animation (`translateY` gentle drift, offset timing so they move independently)
- **Primary card** (foreground, `rotate(-2deg)`): `bg-surface border border-border shadow-lg rounded-xl p-5`
  - Header: gold pill "MONDAY — STRENGTH", live indicator dot `bg-accent`
  - Title: "Back Squat 5×5" `font-bold text-foreground`
  - Subtitle: "@ 80% 1RM — 3 min rest" `text-secondary`
  - Divider `border-border`
  - Metcon label "AMRAP 15 MIN" `text-xs text-accent`
  - Movement list: "10 Pull-ups / 15 Box Jumps (24/20\") / 20 KB Swings" `text-sm text-secondary`
- **Secondary card** (background, `rotate(2deg)`, `opacity-60`, `-mt-6 ml-4`): `bg-surface border border-border shadow rounded-xl p-4`
  - Header: "TUESDAY — METCON"
  - Preview: "For Time: 21-15-9"
- On mount: cards fade in and begin floating (`opacity-0` → `opacity-100` over 0.4s, staggered 0.15s)
- No hover interaction needed — ambient float is the whole effect

### Features Section
- Inline SVG icons (no emoji)
- Cards: `bg-surface rounded-lg border border-border shadow-sm`
- Hover: `border-t-[3px] border-t-accent` transition

### How It Works Section
- 3 numbered steps horizontal
- Ghost large numbers `text-8xl font-black text-border`
- CSS dotted connecting line

### CTA Section
- Always dark `bg-[#0A0A0A]`, gold button

---

## 4. Auth Pages

### `app/(auth)/layout.tsx` — CRITICAL
Strip `<html><body>` shell. If a `metadata` export exists in this file, **move it to `app/layout.tsx`** (or delete if redundant — check for unique values first). Result:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

### Split Layout (login, signup, invite)
`min-h-screen flex`:

**Left panel** (`hidden lg:flex w-3/5`, always dark `bg-[#050508]`):
- Radial gold gradient overlay
- Brand statement Playfair Display: *"Your program, refined by AI."*
- KOVA logo top-left
- "Trusted by 500+ gyms" bottom `text-xs text-secondary`

**Right panel** (`flex-1`, `bg-surface`):
- Centred form max-width 360px
- Logo mobile only (`lg:hidden`)
- Heading Playfair Display `text-2xl`: "Welcome back" / "Create your gym"
- Clean inputs, no wrapping card border

Apply to: `login/page.tsx`, `signup/page.tsx`, `invite/page.tsx`

---

## 5. Dropdown Component

`components/ui/dropdown.tsx`:

```ts
interface DropdownProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; description?: string }[]
  placeholder?: string
  className?: string
}
```

- Click opens `ul`, `absolute z-50 w-full`
- Enter animation: `opacity-0 translate-y-1 scale-95` → `opacity-100 translate-y-0 scale-100` (150ms)
- Keyboard: Arrow Up/Down, Enter, Escape
- `useEffect` `mousedown` listener to close on outside click
- Selected: inline SVG gold checkmark, `text-accent`
- Scrollable > 6 items (`max-h-60 overflow-y-auto`)
- Styling: `bg-surface border border-border shadow-lg rounded-lg`; hover `bg-surface-raised`

Replace `<select>` in:
- `app/(owner)/settings/page.tsx` (timezone, cancellation cutoff, booking window)
- `app/(auth)/signup/page.tsx` (timezone)

---

## 6. Skeleton / Loading Fix

In `globals.css`, rename `.animate-pulse` custom class to `.animate-shimmer`.

Update to use new tokens:
- `components/ui/skeleton.tsx` — class `animate-pulse` → `animate-shimmer`; `bg-white/5` → `bg-foreground-10`
- `components/workout/MovementIntelligencePanel.tsx` — class `animate-pulse` → `animate-shimmer`

The 5 `loading.tsx` files (`dashboard`, `members`, `schedule`, `settings`, `this-week`) use `animate-pulse` via the `Skeleton` component — they need **no direct changes**; the rename in `skeleton.tsx` propagates automatically.

---

## 7. ThemeToggle Component

`components/ui/theme-toggle.tsx` (`'use client'`):
- `useTheme()` from `next-themes`
- Moon icon in light mode (click → dark); Sun icon in dark mode (click → light)
- `aria-label="Toggle theme"`
- Inline SVG, no icon library
- Style: `p-2 rounded-btn text-secondary hover:text-foreground transition-colors`

Added to: landing nav, owner layout header, member layout header

---

## 8. Complete Modified / Created Files

### New files
- `app/providers.tsx` — `Providers` client wrapper for `ThemeProvider`
- `components/ui/theme-toggle.tsx`
- `components/ui/dropdown.tsx`
- `components/landing/wod-cards-hero.tsx` ← **create `components/landing/` directory**

### `app/globals.css`
- Replace `--background`/`--foreground` with full `--color-*` variable set (light + dark)
- Update `body` rule to `var(--color-foreground)` / `var(--color-background)`
- Rename `.animate-pulse` → `.animate-shimmer`

### `tailwind.config.ts`
- Replace entire `colors` block per Section 1
- Remove `accent-border`, add all `accent-N` opacity tokens and `foreground-N` tokens

### `app/layout.tsx`
- Import and wrap `{children}` with `<Providers>`
- Add `suppressHydrationWarning` to existing `<html>` element (keep `lang="en"` and `className`)
- `<body>`: `text-white` → `text-foreground`

### `app/providers.tsx` (new)

### `app/(auth)/layout.tsx`
- Strip `<html><body>`, return fragment; relocate any unique metadata to `app/layout.tsx`

### Auth pages (split layout + token migration)
- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx` (+ `Dropdown` for timezone)
- `app/(auth)/invite/page.tsx`

### Owner pages
- `app/(owner)/layout.tsx` — `ThemeToggle`, update class tokens
- `app/(owner)/dashboard/page.tsx` — `text-white` → `text-foreground`
- `app/(owner)/members/page.tsx` — token migration
- `app/(owner)/schedule/page.tsx` — token migration
- `app/(owner)/settings/page.tsx` — `Dropdown`, token migration
- `app/(owner)/style-profile/page.tsx` — `accent-border` → `border`, `bg-accent-border` → `bg-border`, `text-white` → `text-foreground`

### Member pages
- `app/(member)/layout.tsx` — `ThemeToggle`
- `app/(member)/profile/page.tsx` — token migration
- `app/(member)/my-schedule/page.tsx` — `text-white` → `text-foreground`

### UI components
- `components/ui/button.tsx` — `text-white` → `text-foreground` (check each variant: primary/danger/ghost)
- `components/ui/input.tsx` — replace hardcoded dark values (`bg-[#1a1a1a]`, `border-[#333]`, `text-white`, `focus:border-[#D4AF37]`) with CSS-variable tokens (`bg-surface`, `border-border`, `text-foreground`, `focus:border-accent`)
- `components/ui/card.tsx` — `accent-border` → `border`
- `components/ui/modal.tsx` — `accent-border` → `border`, `text-white` → `text-foreground`
- `components/ui/skeleton.tsx` — `animate-pulse` → `animate-shimmer`, `bg-white/5` → `bg-foreground-10`
- `components/ui/badge.tsx` — `bg-accent/20` → `bg-accent-20`, `bg-white/10` → `bg-foreground-10`

### Layout components
- `components/layout/owner-sidebar.tsx` — `accent-border` → `border`, `bg-accent/10` → `bg-accent-10`, `text-white` → `text-foreground`
- `components/layout/member-nav.tsx` — token migration
- `components/layout/sign-out-button.tsx` — token migration

### Booking components
- `components/booking/cancel-booking-button.tsx` — `accent-border` → `border`
- `components/booking/class-slot-inline.tsx` — `border-accent/40` → `border-accent-40`, `hover:bg-accent/10` → `hover:bg-accent-10`, `text-white` → `text-foreground`
- `components/booking/class-slot.tsx` — `bg-accent/10` → `bg-accent-10`, `border-accent/30` → `border-accent-30`, `hover:bg-accent/20` → `hover:bg-accent-20`, `text-white` → `text-foreground`
- `components/booking/class-tile.tsx` — all `/opacity` replacements per table, `text-white` → `text-foreground`
- `components/booking/week-day-view.tsx` — all `/opacity` replacements per table, `text-white` → `text-foreground`

### Schedule components
- `components/schedule/capacity-defaults.tsx` — replace hardcoded dark tokens (`bg-zinc-800`, `border-zinc-600`, `focus:border-yellow-500`, `text-white`) with system tokens
- `components/schedule/capacity-popover.tsx` — `accent-border` → `border`, `hover:bg-accent/90` → `hover:bg-accent-90`, `text-white` → `text-foreground`
- `components/schedule/class-types-manager.tsx` — token migration
- `components/schedule/schedule-grid.tsx` — token migration

### Workout components
- `components/workout/MovementIntelligencePanel.tsx` — `accent-border` → `border`, `animate-pulse` → `animate-shimmer`, `text-white` → `text-foreground`
- `components/workout/scaling-edit-modal.tsx` — token migration
- `components/workout/workout-card.tsx` — `accent-border` → `border`, `text-white/70` → `text-foreground-70`, `text-white` → `text-foreground`
- `components/workout/workout-edit-modal.tsx` — token migration
- `components/workout/workout-week-grid.tsx` — `accent-border` → `border`, `hover:bg-accent/10` → `hover:bg-accent-10`, `text-white` → `text-foreground`

### Dependencies
- `npm install next-themes`

---

## Out of Scope

- Video background on auth page
- Pricing page
- Any backend / API / database changes
- Mobile app
