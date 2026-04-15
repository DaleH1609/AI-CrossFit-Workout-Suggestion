# Landing Page: Scroll-Triggered Walkthrough Design

## Goal

Replace all fake social proof sections on the landing page with a scroll-triggered product walkthrough that shows the product working — Generate → Review → Publish — in three animated panels. Remove misleading fabricated stats and testimonials.

---

## What Gets Removed

| Section | Why |
|---------|-----|
| Hero inline stats block (500+ Gyms, 10K+ Members, 50K+ WODs) | Fabricated numbers — misleading on a real SaaS |
| Trust bar (`{/* TRUST BAR */}`) | Fabricated gym names |
| Outcome Stats section (`{/* OUTCOME STATS */}`) | "Avg. across 500+ gyms" source is false |
| Testimonials section (`{/* TESTIMONIALS */}`) | Fabricated quotes |
| Static "How It Works" grid (`{/* HOW IT WORKS */}`) | Replaced by the animated walkthrough |

The hero inline stats block is the `<div className="flex gap-8 pt-8 border-t border-border">` element at the bottom of the hero left column — remove it entirely including its wrapping div and the border-t separator.

`WodCardsHero` (the floating WOD cards visual) is **retained unchanged** — it is a separate component from the stats block and is not affected.

The "How It Works" nav link is retained — it points to `#how-it-works` which is now the walkthrough section anchor. The "Features" nav link and the `{/* FEATURES */}` section (`id="features"`) are **not changed**.

---

## What Gets Added

### `WodWalkthrough` component (`components/landing/wod-walkthrough.tsx`)

A `'use client'` React component using IntersectionObserver to drive a three-step walkthrough. The section uses **sticky columns** (both left and right use `sticky top-24`), so both columns remain visible as the user scrolls through three sentinel divs that advance the active step.

The section structure is:

```
<section id="how-it-works">
  header (label + h2)
  <div className="flex gap-16">
    <div className="sticky top-24 ...">  ← left: step list
    <div className="sticky top-24 ...">  ← right: panel container (relative)
      panel 0 (absolute inset-0, opacity-100 when active)
      panel 1 (absolute inset-0, opacity-100 when active)
      panel 2 (absolute inset-0, opacity-100 when active)
  </div>
  sentinel 0  ← ~400px tall invisible div
  sentinel 1  ← ~400px tall invisible div
  sentinel 2  ← ~400px tall invisible div
</section>
```

Panels are absolutely positioned within a fixed-height relative container. Only the active panel has `opacity-100 translate-y-0`; inactive panels have `opacity-0 translate-y-2`. The container height is set explicitly (e.g., `h-[480px]`) so it does not collapse.

#### Scroll trigger logic

Three invisible `aria-hidden` sentinel divs are placed below the sticky columns. IntersectionObserver observes all three at threshold `0.3`. When a sentinel enters the viewport, `setActive(index)` is called. When multiple sentinels are intersecting simultaneously, the **highest index** wins (iterates entries and updates active to the max intersecting index). Observer is disconnected on unmount via `useEffect` cleanup.

On mount: `setActive(0)` so the first panel is visible immediately before any scrolling.

#### Left column: step list

```tsx
<div className="sticky top-24 w-64 flex-shrink-0 flex flex-col gap-6">
```

Three step items. Each item:
- `border-l-2` — `border-accent` when active, `border-transparent` when inactive
- `pl-5 transition-all duration-300`
- Step number: `text-xs font-bold tracking-widest uppercase` — `text-accent` when active, `text-foreground-50` when inactive
- Title: `text-base font-bold text-foreground mt-1`
- Benefit line: `text-sm text-secondary mt-1`

Steps:
| # | Title | Benefit |
|---|-------|---------|
| 01 | Generate | AI writes your full week in under 30 seconds |
| 02 | Review & Edit | Tweak any workout before it goes live |
| 03 | Publish | One tap — members see it instantly |

#### Right column: panel container

```tsx
<div className="sticky top-24 flex-1 relative h-[480px] rounded-card border border-border bg-surface overflow-hidden">
```

Three panels rendered simultaneously with absolute positioning. Active panel: `opacity-100 translate-y-0`. Inactive: `opacity-0 translate-y-2 pointer-events-none`. Both apply `transition-all duration-500 ease-in-out`.

---

## Product Panel Content

### Panel 1 — Generate

Dark mock UI showing the AI writing the week:

```
Header bar:
  "This Week" label (small caps, accent)    [Generating… ● pulse badge]

5 WOD rows (Mon–Fri), each with animation class `wod-row-in` staggered:
  row 0: delay 0s
  row 1: delay 0.2s
  row 2: delay 0.4s
  row 3: delay 0.6s
  row 4: delay 0.8s

Each row:
  [DAY label in accent]  [Workout name]  [Type tag: Strength/Metcon/Skill/Olympic/Endurance]

Footer:
  AI cursor (blinking gold bar 2px × 12px, class `ai-cursor`)
  "AI generating your week" text in muted secondary
```

### Panel 2 — Review & Edit

Mock WOD editor:

```
Day tabs: [Mon ●] [Tue] [Wed] [Thu] [Fri]  — Mon is active (accent underline)

WOD card:
  "MONDAY — STRENGTH" (label, accent, uppercase)
  "Back Squat 5×5" (title, large, foreground)
  "@ 80% 1RM · 3 min rest" (subtitle, secondary)

Scaling section:
  Label: "Scaling Versions"
  Three pills: [Rx ●] [Scaled] [Beginner]
  Rx pill: bg-accent-10 text-accent border border-accent
  Others: bg-surface border border-border text-secondary

Bottom row:
  [Save Changes] button (bg-accent text-background)
  "← Mon  Wed →" navigation (text-secondary text-sm)
```

### Panel 3 — Publish

Mock published week view:

```
5-column grid (Mon–Fri), each cell with animation class `cell-fade-in` staggered:
  cell 0: delay 0s
  cell 1: delay 0.2s
  cell 2: delay 0.4s
  cell 3: delay 0.6s
  cell 4: delay 0.8s

Each cell:
  [DAY label in accent] [✓ green checkmark top-right]
  Two placeholder content lines (bg-accent-10 rounded, h-2)

Footer bar (border-t border-border mt-4 pt-4):
  "5 WODs published · 15 Scaling versions · Live to members ↗"
  Text: text-xs text-secondary
  "↗" accent color
```

---

## Keyframes (add to `globals.css`)

```css
@keyframes wodRowIn {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes cellFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes blinkCursor {
  50% { opacity: 0; }
}

.wod-row-in {
  animation: wodRowIn 0.4s ease forwards;
}

.cell-fade-in {
  animation: cellFadeIn 0.3s ease forwards;
}

.ai-cursor {
  display: inline-block;
  width: 2px;
  height: 12px;
  background: var(--color-accent);
  border-radius: 1px;
  animation: blinkCursor 0.8s steps(1) infinite;
  vertical-align: middle;
  margin-left: 2px;
}
```

Animation delays are applied via inline `style={{ animationDelay: '0.2s' }}` on each row/cell element.

---

## Page Structure After Change

```
NAV  (retain "How It Works" link → #how-it-works)
HERO (remove inline stats block; retain WodCardsHero)
WALKTHROUGH  id="how-it-works"  ← new
FEATURES
CTA  (update subtitle only: "Join gym owners already using KOVA to program smarter." → "Start programming smarter today." The h2 heading and button label are unchanged.)
FOOTER
```

---

## Component Architecture

| File | Change |
|------|--------|
| `app/page.tsx` | Remove 5 sections + hero stats block; import + render `<WodWalkthrough />`; update CTA subtitle only |
| `components/landing/wod-walkthrough.tsx` | New `'use client'` component |
| `app/globals.css` | Add 3 keyframes + 3 utility classes |

No new dependencies.

---

## Tailwind Constraints

- Tailwind CSS v3 — no `/N` opacity modifiers on CSS custom property tokens
- Use pre-defined tokens: `bg-accent-10`, `bg-surface`, `bg-surface-raised`, `text-secondary`, `border-border`
- Full opacity: `opacity-100` (not `opacity-1`)
- Panel crossfade: `transition-all duration-500 ease-in-out` on each panel div
- Step transitions: `transition-all duration-300` on step item divs
- Animation stagger: inline `style={{ animationDelay }}` — do not use arbitrary Tailwind values for delays
- `border-secondary/40` already exists in the hero `<Link>` (line 47 of `app/page.tsx`) — this is a pre-existing constraint violation in code not touched by this feature; do not fix it in this task (out of scope)

## IntersectionObserver Implementation Notes

```tsx
// Three individual refs — required for strict TypeScript
const sentinelRefs = [
  useRef<HTMLDivElement>(null),
  useRef<HTMLDivElement>(null),
  useRef<HTMLDivElement>(null),
]

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      let next = active
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = sentinelRefs.findIndex(r => r.current === e.target)
          if (idx > next) next = idx
        }
      })
      if (next !== active) setActive(next)
    },
    { threshold: 0.3, rootMargin: '0px' }
  )
  sentinelRefs.forEach(r => { if (r.current) observer.observe(r.current) })
  return () => observer.disconnect()
}, [active])
```

Mid-scroll page load edge case (user arrives at `#how-it-works` directly): not handled — the component defaults to step 0 on mount, which is acceptable. The user scrolling will correct the state immediately. YAGNI.

---

## Acceptance Criteria

- [ ] Hero no longer shows 500+ Gyms / 10K+ Members / 50K+ WODs stats block
- [ ] WodCardsHero floating cards are still visible in hero
- [ ] Trust bar is removed
- [ ] Outcome Stats section is removed
- [ ] Static "How It Works" grid is removed
- [ ] Testimonials section is removed
- [ ] `WodWalkthrough` renders with `id="how-it-works" className="... scroll-mt-16 ..."` between hero and features sections
- [ ] Scrolling through the sentinel area advances the active step (0 → 1 → 2)
- [ ] Each panel crossfades (opacity + translate) when active step changes
- [ ] Panel 1 WOD rows animate in with stagger when panel is active
- [ ] Panel 3 cells fade in with stagger when panel is active
- [ ] Step list items show accent border + text when active
- [ ] IntersectionObserver is disconnected on component unmount
- [ ] CTA copy updated to "Start programming smarter today."
- [ ] `npm run build` passes with no TypeScript or ESLint errors
