# Landing Scroll Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two interactive features to the KOVA landing page — a scroll-pinned 3D phrase spinner between the hero and WodWalkthrough sections, and an upgraded 3-card WodCardsHero with a pure-CSS hover fan-out effect.

**Architecture:** The phrase spinner is a new `'use client'` component that uses a `requestAnimationFrame` loop reading `getBoundingClientRect()` to map scroll progress to a CSS `rotateY` value on a 3D cylinder of phrases. The card stack enhancement replaces JS mouse event handling with a pure CSS `:hover` trick where different `transition` values on the base vs hover state produce different easing curves for enter vs exit.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v3, CSS 3D transforms, no additional libraries.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `components/landing/phrase-spinner.tsx` | Create | Scroll-driven 3D phrase carousel |
| `components/landing/wod-cards-hero.tsx` | Modify | Add 3rd card, pure-CSS hover fan |
| `app/globals.css` | Modify | Add `float-card-c` keyframe + utility class |
| `app/page.tsx` | Modify | Insert `<PhraseSpinner />` between hero and `<WodWalkthrough />` |

---

## Task 1: Add `float-card-c` keyframe to globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add the keyframe and utility class**

Open `app/globals.css`. After the existing `.animate-float-b` line, add:

```css
@keyframes float-card-c {
  0%, 100% { transform: translateY(0px) rotate(-4deg); }
  50%       { transform: translateY(-4px) rotate(-4deg); }
}
.animate-float-c { animation: float-card-c 7s ease-in-out infinite 1.6s; }
```

- [ ] **Step 2: Verify the file is valid**

Run: `npx tailwindcss --input app/globals.css --output /dev/null 2>&1 | head -5`
Expected: no errors printed.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add float-card-c keyframe for third WOD card"
```

---

## Task 2: Upgrade WodCardsHero to 3-card pure-CSS fan

**Files:**
- Modify: `components/landing/wod-cards-hero.tsx`

- [ ] **Step 1: Replace the component with the upgraded version**

Overwrite `components/landing/wod-cards-hero.tsx` with:

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
    <div
      className="relative h-[420px] flex items-center justify-center select-none"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/*
        Pure-CSS hover fan trick:
        - `.wod-card` base transition  = EXIT easing (hover-off): snappy overshoot
        - `.card-stack:hover .wod-card` transition = ENTER easing (hover-on): spring out
        No JS mouse events needed.
      */}
      <style>{`
        .wod-card {
          transition:
            transform  0.42s cubic-bezier(0.36, 0, 0.66, -0.25),
            opacity    0.35s ease,
            box-shadow 0.35s ease;
        }
        .card-stack:hover .wod-card {
          transition:
            transform  0.52s cubic-bezier(0.34, 1.5, 0.64, 1),
            opacity    0.35s ease,
            box-shadow 0.4s ease;
        }

        /* c1 — front card: stays in place on hover */
        .card-stack:hover .c1 {
          animation: none;
          transform: rotate(-1.5deg);
          box-shadow: 0 8px 28px rgba(0,0,0,0.09), 0 0 0 1.5px rgba(184,149,42,0.18);
        }

        /* c2 — mid card: fans right */
        .card-stack:hover .c2 {
          animation: none;
          transform: translateX(148px) rotate(9deg) translateY(-14px);
          opacity: 1;
          box-shadow: 0 12px 36px rgba(0,0,0,0.09), 0 0 0 1.5px rgba(184,149,42,0.13);
          transition-delay: 0.04s;
        }

        /* c3 — back card: fans left */
        .card-stack:hover .c3 {
          animation: none;
          transform: translateX(-148px) rotate(-10deg) translateY(-10px);
          opacity: 1;
          box-shadow: 0 12px 36px rgba(0,0,0,0.09), 0 0 0 1.5px rgba(184,149,42,0.13);
          transition-delay: 0.08s;
        }

        .card-stack:hover .stack-hint { opacity: 0; }
      `}</style>

      <div className="card-stack relative" style={{ width: 288, height: 230, overflow: 'visible', cursor: 'pointer' }}>

        {/* c3 — Wednesday Skills (back, fans left) */}
        <div
          className={`wod-card c3 absolute w-[272px] bg-surface border border-border rounded-xl p-4
            transition-opacity duration-500
            ${visible ? 'animate-float-c' : 'opacity-0'}`}
          style={{ top: 18, left: 8, transform: 'rotate(-4deg)', opacity: visible ? 0.38 : 0, zIndex: 1 }}
        >
          <p className="text-xs font-semibold tracking-widest text-secondary uppercase mb-1">Wednesday — Skills</p>
          <p className="text-sm text-foreground font-medium">Gymnastics EMOM</p>
          <p className="text-xs text-secondary mt-1">20 min — 4 movements</p>
          <div className="border-t border-border my-3" />
          <ul className="space-y-1">
            {['Strict HSPU', 'L-Sit Hold 30s', 'Ring Muscle-ups'].map(m => (
              <li key={m} className="text-xs text-secondary">· {m}</li>
            ))}
          </ul>
        </div>

        {/* c2 — Tuesday Metcon (mid, fans right) */}
        <div
          className={`wod-card c2 absolute w-[272px] bg-surface border border-border rounded-xl p-4
            transition-opacity duration-500
            ${visible ? 'animate-float-b' : 'opacity-0'}`}
          style={{ top: 10, left: 8, transform: 'rotate(3deg)', opacity: visible ? 0.65 : 0, zIndex: 2, transitionDelay: '100ms' }}
        >
          <p className="text-xs font-semibold tracking-widest text-secondary uppercase mb-1">Tuesday — Metcon</p>
          <p className="text-sm text-foreground font-medium">For Time: 21-15-9</p>
          <p className="text-xs text-secondary mt-1">Thrusters / Pull-ups</p>
          <div className="border-t border-border my-3" />
          <ul className="space-y-1">
            {['Thrusters (42.5 / 30 kg)', 'Pull-ups'].map(m => (
              <li key={m} className="text-xs text-secondary">· {m}</li>
            ))}
          </ul>
        </div>

        {/* c1 — Monday Strength (front, stays put) */}
        <div
          className={`wod-card c1 absolute w-[272px] bg-surface border border-border shadow-lg rounded-xl p-5
            transition-opacity duration-500
            ${visible ? 'animate-float-a' : 'opacity-0'}`}
          style={{ top: 0, left: 8, transform: 'rotate(-1.5deg)', zIndex: 3, transitionDelay: '150ms' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold tracking-widest text-accent uppercase">Monday — Strength</span>
            <span className="w-2 h-2 rounded-full bg-accent block" />
          </div>
          <p className="text-base font-bold text-foreground mb-0.5">Back Squat 5×5</p>
          <p className="text-xs text-secondary mb-3">@ 80% 1RM — 3 min rest</p>
          <div className="border-t border-border mb-3" />
          <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-2">AMRAP 15 MIN</p>
          <ul className="space-y-1">
            {['10 Pull-ups', '15 Box Jumps (24/20")', '20 KB Swings (24/16 kg)'].map(m => (
              <li key={m} className="text-sm text-secondary">· {m}</li>
            ))}
          </ul>
        </div>

        {/* Hover hint */}
        <p
          className="stack-hint absolute text-[9px] tracking-widest uppercase text-secondary/40 whitespace-nowrap pointer-events-none"
          style={{ bottom: -22, left: '50%', transform: 'translateX(-50%)', transition: 'opacity 0.3s' }}
        >
          Hover to reveal
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Visually verify in dev server**

Run: `cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npm run dev`

Open `http://localhost:3000`. Confirm:
- 3 cards visible in hero, stacked with different rotations and opacities
- Cards float gently
- Hover fans c2 right, c3 left; c1 stays put
- Hover-off snaps back smoothly with no stutter

- [ ] **Step 3: Commit**

```bash
git add components/landing/wod-cards-hero.tsx
git commit -m "feat: upgrade WodCardsHero to 3-card pure-CSS hover fan"
```

---

## Task 3: Create PhraseSpinner component

**Files:**
- Create: `components/landing/phrase-spinner.tsx`

- [ ] **Step 1: Create the component**

Create `components/landing/phrase-spinner.tsx`:

```tsx
'use client'
import { useEffect, useRef } from 'react'

const PHRASES = [
  { num: '01', line1: 'Train ', accent1: 'Smarter.', line2: 'Coach Better.', accent2: '' },
  { num: '02', line1: 'Your Gym.', accent1: '', line2: '', accent2: 'Your Style.' },
  { num: '03', line1: 'Less Planning.', accent1: '', line2: '', accent2: 'More Coaching.' },
]

const NUM_PHRASES = PHRASES.length
const STEP = 360 / NUM_PHRASES          // 120°
const MAX_ROTATION = STEP * (NUM_PHRASES - 1)  // 240° — stops at last phrase

export function PhraseSpinner() {
  const outerRef    = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const pip0Ref     = useRef<HTMLDivElement>(null)
  const pip1Ref     = useRef<HTMLDivElement>(null)
  const pip2Ref     = useRef<HTMLDivElement>(null)
  const eyebrowRef  = useRef<HTMLParagraphElement>(null)
  const cueRef      = useRef<HTMLParagraphElement>(null)
  const rotRef      = useRef(0)  // current interpolated rotation
  const rafRef      = useRef<number>(0)

  useEffect(() => {
    const pipRefs = [pip0Ref, pip1Ref, pip2Ref]

    function tick() {
      const outer = outerRef.current
      const carousel = carouselRef.current
      if (!outer || !carousel) { rafRef.current = requestAnimationFrame(tick); return }

      const rect      = outer.getBoundingClientRect()
      const maxScroll = outer.offsetHeight - window.innerHeight
      const progress  = Math.max(0, Math.min(1, -rect.top / maxScroll))

      // Target rotation: multiply by 1.15 so full rotation is reached at ~87% progress
      const target = Math.min(progress * MAX_ROTATION * 1.15, MAX_ROTATION)
      rotRef.current += (target - rotRef.current) * 0.12

      carousel.style.transform = `rotateY(${-rotRef.current}deg)`

      // Active pip: nearest 120° step, clamped 0–2
      const active = Math.min(Math.round(rotRef.current / STEP), NUM_PHRASES - 1)
      pipRefs.forEach((ref, i) => {
        if (!ref.current) return
        ref.current.style.background = i === active ? 'var(--color-accent)' : 'var(--color-border)'
        ref.current.style.transform  = i === active ? 'scale(1.6)' : 'scale(1)'
      })

      // Eyebrow + cue visibility
      if (eyebrowRef.current) {
        eyebrowRef.current.style.color =
          progress > 0.01 && progress < 0.99
            ? 'var(--color-accent)'
            : 'color-mix(in srgb, var(--color-secondary) 30%, transparent)'
      }
      if (cueRef.current) {
        cueRef.current.style.opacity = progress > 0.06 ? '0' : '1'
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div
      ref={outerRef}
      // 400vh desktop, 250vh mobile — use className for responsive height
      className="relative h-[250vh] md:h-[400vh]"
      aria-hidden="true"
    >
      {/* Sticky container */}
      <div
        className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden bg-background border-t border-b border-border"
      >
        {/* Subtle gold radial wash */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, var(--color-accent-6, rgba(184,149,42,0.06)) 0%, transparent 70%)' }}
        />

        {/* Eyebrow */}
        <p
          ref={eyebrowRef}
          className="relative text-[10px] font-bold tracking-[0.25em] uppercase mb-11 transition-colors duration-700"
          style={{ color: 'color-mix(in srgb, var(--color-secondary) 30%, transparent)' }}
        >
          What KOVA is about
        </p>

        {/* 3D scene */}
        <div
          className="relative"
          style={{
            perspective: '900px',
            width: 'min(680px, 90vw)',
            height: 200,
          }}
        >
          <div
            ref={carouselRef}
            style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
          >
            {PHRASES.map((phrase, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: `rotateY(${i * STEP}deg) translateZ(280px)`,
                }}
              >
                <p className="text-[9px] font-bold tracking-[0.25em] text-accent mb-4 opacity-60">{phrase.num}</p>
                <p className="font-display text-[clamp(28px,4.5vw,52px)] font-bold leading-[1.15] text-center tracking-tight text-foreground">
                  {/* Line 1 */}
                  {phrase.line1}
                  {phrase.accent1 && <em className="not-italic text-accent">{phrase.accent1}</em>}
                  {/* Line 2 */}
                  {(phrase.line2 || phrase.accent2) && (
                    <><br />{phrase.line2}<em className="not-italic text-accent">{phrase.accent2}</em></>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Progress pips */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col gap-2.5">
          {[pip0Ref, pip1Ref, pip2Ref].map((ref, i) => (
            <div
              key={i}
              ref={ref}
              style={{
                width: 5, height: 5, borderRadius: '50%',
                background: i === 0 ? 'var(--color-accent)' : 'var(--color-border)',
                transform: i === 0 ? 'scale(1.6)' : 'scale(1)',
                transition: 'background 0.5s, transform 0.5s',
              }}
            />
          ))}
        </div>

        {/* Scroll cue */}
        <p
          ref={cueRef}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.18em] uppercase text-secondary/40 flex items-center gap-1.5 whitespace-nowrap pointer-events-none"
          style={{ transition: 'opacity 0.5s' }}
        >
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
            <path d="M5 1v8M5 9l-3-3M5 9l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Keep scrolling
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx tsc --noEmit 2>&1 | head -20`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/landing/phrase-spinner.tsx
git commit -m "feat: add PhraseSpinner scroll-driven component"
```

---

## Task 4: Wire PhraseSpinner into the landing page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Import and insert PhraseSpinner**

In `app/page.tsx`, add the import at the top with the other landing imports:

```tsx
import { PhraseSpinner } from '@/components/landing/phrase-spinner'
```

Then insert `<PhraseSpinner />` directly between the closing `</section>` of the hero and the `<WodWalkthrough />` line:

```tsx
      </section>

      <PhraseSpinner />

      <WodWalkthrough />
```

- [ ] **Step 2: Verify in dev server**

With `npm run dev` running, open `http://localhost:3000`.

Scroll down from the hero and confirm:
1. The phrase spinner section appears and pins to the viewport
2. Scrolling through it rotates phrase 1 → 2 → 3
3. Rotation stops on phrase 3 (does not wrap back to phrase 1)
4. Progress pips update correctly
5. "Keep scrolling" cue fades once you start scrolling
6. After scrolling past, the WodWalkthrough section appears normally

- [ ] **Step 3: Check mobile (resize browser to ~390px wide)**

Confirm:
- Phrases are readable at mobile font size (clamp ensures min 28px)
- Section is still functional (scrolls through all 3 phrases)
- No horizontal overflow

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire PhraseSpinner into landing page between hero and walkthrough"
```

---

## Task 5: Final visual QA pass

- [ ] **Step 1: Run dev server and do a full scroll-through**

`npm run dev` → `http://localhost:3000`

Checklist:
- [ ] Hero renders correctly with 3 floating WOD cards
- [ ] WOD card hover: c1 stays put, c2 fans right, c3 fans left
- [ ] WOD card hover-off: no stutter, snappy overshoot collapse
- [ ] PhraseSpinner: pins correctly as you scroll into it
- [ ] PhraseSpinner: phrase 1 → 2 → 3, stops on 3
- [ ] PhraseSpinner: pips, eyebrow, and scroll cue all behave correctly
- [ ] WodWalkthrough still renders after the spinner
- [ ] Features section, CTA, footer still intact
- [ ] No console errors

- [ ] **Step 2: Check dark mode (if applicable)**

Toggle dark mode via the ThemeToggle in the nav. Confirm accent colours update correctly (gold shifts from `#B8952A` to `#D4AF37`).

- [ ] **Step 3: Final commit if any polish fixes were made**

```bash
git add -p
git commit -m "fix: landing page scroll interaction polish"
```
