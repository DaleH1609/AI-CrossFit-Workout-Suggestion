# Landing Walkthrough Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all fake social proof sections on the landing page with a scroll-triggered product walkthrough (Generate → Review → Publish) and remove misleading fabricated stats.

**Architecture:** A new `'use client'` component `WodWalkthrough` uses IntersectionObserver on three sentinel divs to drive a sticky three-step walkthrough. The active step highlights in the left column and crossfades the right product panel. `app/page.tsx` is updated to remove five fake sections and render the new component. Three CSS keyframes are added to `globals.css` for row/cell slide-in and cursor blink animations.

**Tech Stack:** Next.js 14 App Router, React (useState/useEffect/useRef), Tailwind CSS v3, TypeScript strict mode. No new dependencies.

---

## File Map

| File | Change |
|------|--------|
| `app/globals.css` | Add 3 keyframes + 3 utility classes at end of file |
| `components/landing/wod-walkthrough.tsx` | Create new `'use client'` component |
| `app/page.tsx` | Remove 5 fake sections + hero stats block; import + render `<WodWalkthrough />`; update CTA subtitle |

---

## Task 1: Add animation keyframes to globals.css

**Files:**
- Modify: `app/globals.css` (append to end of file, after line 104)

No automated tests for CSS. Verification: `npm run build` passes.

- [ ] **Step 1: Open `app/globals.css` and confirm the last line**

Read `app/globals.css`. The file currently ends at line 104 with:
```css
.animate-float-b { animation: float-card-b 6s ease-in-out infinite 1s; }
```
You will append after this line.

- [ ] **Step 2: Append the three keyframes and utility classes**

Add at the end of `app/globals.css`:

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

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npm run build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: add walkthrough animation keyframes to globals.css"
```

---

## Task 2: Create WodWalkthrough component

**Files:**
- Create: `components/landing/wod-walkthrough.tsx`

No automated tests for this visual component. Verification: `npm run build` passes (TypeScript strict mode).

- [ ] **Step 1: Create the file with the full component**

Create `components/landing/wod-walkthrough.tsx`:

```tsx
'use client'
import { useState, useEffect, useRef } from 'react'

const STEPS = [
  {
    num: '01',
    title: 'Generate',
    benefit: 'AI writes your full week in under 30 seconds',
  },
  {
    num: '02',
    title: 'Review & Edit',
    benefit: 'Tweak any workout before it goes live',
  },
  {
    num: '03',
    title: 'Publish',
    benefit: 'One tap — members see it instantly',
  },
]

const WOD_ROWS = [
  { day: 'Mon', name: 'Back Squat 5×5 + AMRAP 15', tag: 'Strength' },
  { day: 'Tue', name: '21-15-9 Thrusters / Pull-ups', tag: 'Metcon' },
  { day: 'Wed', name: 'EMOM 20 — Gymnastics Focus', tag: 'Skill' },
  { day: 'Thu', name: 'Clean & Jerk 1RM + RFT', tag: 'Olympic' },
  { day: 'Fri', name: 'Hero WOD — Murph Prep', tag: 'Endurance' },
]

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function PanelGenerate() {
  return (
    <div className="h-full flex flex-col p-6 bg-surface rounded-card border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-bold tracking-widest text-accent uppercase">This Week · Mon–Fri</span>
        <span className="flex items-center gap-1.5 text-xs text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse flex-shrink-0" />
          Generating…
        </span>
      </div>
      {/* WOD rows */}
      <div className="flex flex-col gap-2 flex-1">
        {WOD_ROWS.map((row, i) => (
          <div
            key={row.day}
            className="wod-row-in flex items-center gap-3 px-3 py-2.5 bg-background border border-border rounded-btn"
            style={{ animationDelay: `${i * 0.2}s`, opacity: 0 }}
          >
            <span className="text-xs font-bold text-accent w-6 flex-shrink-0">{row.day}</span>
            <span className="text-xs text-foreground flex-1">{row.name}</span>
            <span className="text-xs text-secondary bg-surface border border-border px-2 py-0.5 rounded flex-shrink-0">{row.tag}</span>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border flex items-center gap-1.5">
        <span className="ai-cursor" />
        <span className="text-xs text-secondary">AI generating your week</span>
      </div>
    </div>
  )
}

function PanelReview() {
  return (
    <div className="h-full flex flex-col p-6 bg-surface rounded-card border border-border">
      {/* Day tabs */}
      <div className="flex gap-1 mb-5">
        {WEEK_DAYS.map((day, i) => (
          <button
            key={day}
            className={`px-3 py-1.5 text-xs font-semibold rounded-btn transition-colors ${
              i === 0
                ? 'bg-accent text-background'
                : 'text-secondary hover:text-foreground'
            }`}
          >
            {day}
          </button>
        ))}
      </div>
      {/* WOD card */}
      <div className="bg-background border border-border rounded-card p-4 mb-4">
        <div className="text-xs font-bold tracking-widest text-accent uppercase mb-1">Monday — Strength</div>
        <div className="text-lg font-bold text-foreground mb-1">Back Squat 5×5</div>
        <div className="text-sm text-secondary">@ 80% 1RM · 3 min rest</div>
      </div>
      {/* Scaling */}
      <div className="mb-4">
        <div className="text-xs text-secondary uppercase tracking-widest mb-2">Scaling Versions</div>
        <div className="flex gap-2">
          <span className="px-3 py-1 text-xs font-semibold rounded-btn bg-accent-10 text-accent border border-accent">Rx</span>
          <span className="px-3 py-1 text-xs font-semibold rounded-btn bg-surface border border-border text-secondary">Scaled</span>
          <span className="px-3 py-1 text-xs font-semibold rounded-btn bg-surface border border-border text-secondary">Beginner</span>
        </div>
      </div>
      {/* Bottom row */}
      <div className="mt-auto flex items-center justify-between">
        <button className="px-4 py-2 text-xs font-bold tracking-widest uppercase rounded-btn bg-accent text-background">
          Save Changes
        </button>
        <span className="text-xs text-secondary">← Mon&nbsp;&nbsp;Wed →</span>
      </div>
    </div>
  )
}

function PanelPublish() {
  return (
    <div className="h-full flex flex-col p-6 bg-surface rounded-card border border-border">
      {/* Week grid */}
      <div className="grid grid-cols-5 gap-2 flex-1">
        {WEEK_DAYS.map((day, i) => (
          <div
            key={day}
            className="cell-fade-in relative bg-background border border-border rounded-btn p-3"
            style={{ animationDelay: `${i * 0.2}s`, opacity: 0 }}
          >
            <div className="text-xs font-bold text-accent mb-2">{day}</div>
            <div className="h-2 bg-accent-10 rounded mb-1.5" />
            <div className="h-2 bg-surface-raised rounded" />
            <span className="absolute top-2 right-2 text-xs text-green-400">✓</span>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border">
        <span className="text-xs text-secondary">
          5 WODs published · 15 Scaling versions · {' '}
          <span className="text-accent">Live to members ↗</span>
        </span>
      </div>
    </div>
  )
}

const PANELS = [<PanelGenerate key="generate" />, <PanelReview key="review" />, <PanelPublish key="publish" />]

export function WodWalkthrough() {
  const [active, setActive] = useState(0)

  const sentinel0 = useRef<HTMLDivElement>(null)
  const sentinel1 = useRef<HTMLDivElement>(null)
  const sentinel2 = useRef<HTMLDivElement>(null)
  const sentinelRefs = [sentinel0, sentinel1, sentinel2]

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let next = active
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = sentinelRefs.findIndex(r => r.current === e.target)
            if (idx !== -1 && idx > next) next = idx
          }
        })
        if (next !== active) setActive(next)
      },
      { threshold: 0.3, rootMargin: '0px' }
    )
    sentinelRefs.forEach(r => { if (r.current) observer.observe(r.current) })
    return () => observer.disconnect()
  }, [active])

  return (
    <section
      id="how-it-works"
      className="max-w-6xl mx-auto px-8 py-24 scroll-mt-16"
    >
      {/* Section header */}
      <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-4">How It Works</p>
      <h2 className="font-display text-4xl font-bold text-foreground tracking-tight mb-14">
        From idea to published<br />
        <span className="text-accent">in three steps.</span>
      </h2>

      {/* Sticky columns */}
      <div className="flex gap-12 lg:gap-16">
        {/* Left: step list */}
        <div className="hidden lg:flex sticky top-24 w-56 flex-shrink-0 flex-col gap-8 self-start">
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className={`border-l-2 pl-5 transition-all duration-300 ${
                active === i ? 'border-accent' : 'border-transparent'
              }`}
            >
              <div className={`text-xs font-bold tracking-widest uppercase transition-colors duration-300 ${
                active === i ? 'text-accent' : 'text-secondary'
              }`}>
                {step.num}
              </div>
              <div className="text-base font-bold text-foreground mt-1">{step.title}</div>
              <div className="text-sm text-secondary mt-1">{step.benefit}</div>
            </div>
          ))}
        </div>

        {/* Right: panel container */}
        <div className="flex-1 sticky top-24 self-start">
          <div className="relative h-[440px] lg:h-[480px]">
            {PANELS.map((panel, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                  active === i
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-2 pointer-events-none'
                }`}
              >
                {panel}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll sentinels — invisible, drive step advancement */}
      <div ref={sentinel0} className="h-[300px] mt-8" aria-hidden="true" />
      <div ref={sentinel1} className="h-[300px]" aria-hidden="true" />
      <div ref={sentinel2} className="h-[300px]" aria-hidden="true" />
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npm run build 2>&1 | tail -15
```
Expected: `✓ Compiled successfully` with no TypeScript errors.

If there are TypeScript errors, fix them before proceeding. Common pitfalls:
- `sentinelRefs.findIndex` comparing `r.current === e.target` — `e.target` is `EventTarget | null` — you may need `e.target as Element` or cast via `instanceof HTMLDivElement` check.
- The `active` closure in `useEffect` deps — if the linter flags it, change to a `useEffect` with `[active]` in the deps array (already specified in spec).

- [ ] **Step 3: Commit**

```bash
git add components/landing/wod-walkthrough.tsx
git commit -m "feat: add WodWalkthrough scroll-triggered product demo component"
```

---

## Task 3: Update app/page.tsx

**Files:**
- Modify: `app/page.tsx`

This task removes five sections, the hero stats block, imports the new component, and updates the CTA subtitle. No automated tests — verification is `npm run build` + visual check.

- [ ] **Step 1: Remove the hero inline stats block**

In `app/page.tsx`, locate and delete the stats block inside the hero left column (approximately lines 51–62). It starts with:

```tsx
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
```

Delete this block entirely (the `<div className="flex gap-8 ...">` and everything inside it up to and including its closing `</div>`).

- [ ] **Step 2: Remove the TRUST BAR section**

Delete the entire `{/* TRUST BAR */}` block:

```tsx
      {/* TRUST BAR */}
      <div className="border-b border-border bg-surface-raised">
        <div className="max-w-6xl mx-auto px-8 py-4 overflow-x-auto">
          <div className="flex items-center gap-3 flex-nowrap">
            <span className="text-xs text-secondary uppercase tracking-widest whitespace-nowrap flex-shrink-0">
              Trusted by
            </span>
            {[
              'CrossFit Dublin', 'Rogue Training Co.', 'HYROX London',
              'Iron & Oak CF', 'Threshold CrossFit', 'Grid Athletics',
            ].map(gym => (
              <span
                key={gym}
                className="inline-flex items-center gap-1.5 bg-background border border-border rounded-btn px-3 py-1 text-xs font-semibold text-foreground whitespace-nowrap flex-shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                {gym}
              </span>
            ))}
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Remove the OUTCOME STATS section**

Delete the entire `{/* OUTCOME STATS */}` block:

```tsx
      {/* OUTCOME STATS */}
      <section className="bg-surface border-b border-border">
        <div className="max-w-6xl mx-auto px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
            {[
              { stat: '4h → 20m', desc: 'Weekly programming time saved', source: 'Avg. across 500+ gyms' },
              { stat: '< 30s',    desc: 'To generate a full week of WODs', source: 'Rx, Scaled & Beginner included' },
              { stat: '2 types',  desc: 'CrossFit & Hyrox built-in', source: 'Switch any time in settings' },
            ].map(item => (
              <div key={item.stat} className="bg-surface p-10">
                <div className="text-3xl font-black text-accent leading-none mb-2">{item.stat}</div>
                <div className="text-sm text-foreground font-medium mb-1">{item.desc}</div>
                <div className="text-xs text-secondary">{item.source}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
```

- [ ] **Step 4: Remove the HOW IT WORKS section**

Delete the entire `{/* HOW IT WORKS */}` block:

```tsx
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
```

- [ ] **Step 5: Remove the TESTIMONIALS section**

Delete the entire `{/* TESTIMONIALS */}` block:

```tsx
      {/* TESTIMONIALS */}
      <section className="max-w-6xl mx-auto px-8 py-24">
        <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-4">
          What gym owners say
        </p>
        <h2 className="font-display text-4xl font-bold text-foreground tracking-tight mb-14">
          Real gyms.<br />
          <span className="text-accent">Real results.</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              initials: 'JM',
              name: 'Jamie M.',
              gym: 'CrossFit Northside',
              quote: 'Cut my weekly programming time from 4 hours to under 20 minutes. I actually look forward to programming now.',
            },
            {
              initials: 'SR',
              name: 'Sarah R.',
              gym: 'Forge Functional Fitness',
              quote: 'My members love that the scaling is actually smart — not just lighter weights. KOVA gets it.',
            },
            {
              initials: 'TK',
              name: 'Tom K.',
              gym: 'HYROX Academy',
              quote: 'Worth every penny. Programming used to be the worst part of my week. Now it takes 20 minutes on a Sunday.',
            },
          ].map(t => (
            <div key={t.name} className="bg-surface border border-border rounded-card p-8">
              <div className="text-accent text-sm mb-3">★★★★★</div>
              <p className="text-sm text-foreground leading-relaxed mb-5 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent-10 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-secondary mt-0.5">{t.gym}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
```

- [ ] **Step 6: Add the WodWalkthrough import and render it**

Add this import at the top of `app/page.tsx`, after the existing imports:

```tsx
import { WodWalkthrough } from '@/components/landing/wod-walkthrough'
```

Then, in the JSX after the hero `</section>` closing tag and before `{/* FEATURES */}`, insert:

```tsx
      <WodWalkthrough />
```

- [ ] **Step 7: Update the CTA subtitle**

Locate the CTA subtitle `<p>` (currently reads "Join gym owners already using KOVA to program smarter.") and change it to:

```tsx
<p className="text-secondary text-base mb-10">Start programming smarter today.</p>
```

- [ ] **Step 8: Verify build passes**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npm run build 2>&1 | tail -15
```
Expected: `✓ Compiled successfully`. If TypeScript errors appear, fix before committing.

- [ ] **Step 9: Commit**

```bash
git add app/page.tsx
git commit -m "feat: replace fake social proof with scroll-triggered walkthrough on landing page"
```

---

## Task 4: Final verification and deploy

- [ ] **Step 1: Run a clean build**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npm run build 2>&1 | tail -20
```
Expected: all pages compile, no TypeScript or ESLint errors.

- [ ] **Step 2: Visually verify**

Start the dev server and open the landing page:

```bash
npm run dev
```

Check:
- Hero shows no stats (no "500+", "10K+", "50K+")
- `WodCardsHero` floating cards still visible in hero right column
- No trust bar below hero
- No fake stats section
- Scrolling past the hero → walkthrough section appears with step list (left) and product panel (right)
- Scrolling through the sentinels → step 0 → 1 → 2 advances, panel crossfades
- Features section still present below walkthrough
- CTA says "Start programming smarter today."
- No fake testimonials

- [ ] **Step 3: Deploy to production**

```bash
vercel --prod
```
Expected: deployment URL returned with status READY.
