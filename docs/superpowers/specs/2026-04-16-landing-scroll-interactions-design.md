# Landing Page Scroll Interactions — Design Spec

**Date:** 2026-04-16
**Status:** Approved

---

## Overview

Two interactive enhancements to the KOVA landing page (`app/page.tsx`):

1. **Scroll-pinned phrase spinner** — a sticky section between the Hero and WodWalkthrough where 3 brand phrases rotate into view as the user scrolls, stopping on the final phrase.
2. **Upgraded WodCardsHero** — a 3-card stack where the front card stays anchored and the two behind it fan out on hover using pure CSS.

---

## 1. Scroll-Pinned Phrase Spinner

### Behaviour
- Outer wrapper is `height: 400vh`. Inner content is `position: sticky; top: 0; height: 100vh`.
- Scroll progress formula (in `rAF` loop):
  ```
  const scrolled  = -outerEl.getBoundingClientRect().top
  const maxScroll = outerEl.offsetHeight - window.innerHeight
  const progress  = Math.max(0, Math.min(1, scrolled / maxScroll))
  ```
- Progress maps to rotation `0° → 240°` (stops at phrase 3, does not wrap back).
  ```
  const MAX_ROTATION = 240
  const target = Math.min(progress * MAX_ROTATION * 1.15, MAX_ROTATION)
  currentRotation += (target - currentRotation) * 0.12
  ```
  (The 1.15 multiplier means full rotation is reached at ~87% scroll progress, giving a comfortable settle before the section ends.)
- `rAF` loop is started in `useEffect` and cancelled on unmount via `cancelAnimationFrame(rafId)`.
- No `window` scroll listener — uses `rAF` polling `getBoundingClientRect` exclusively.

### 3D CSS setup (critical)
```css
.scene   { perspective: 900px; }           /* must be on the PARENT */
.carousel { transform-style: preserve-3d; } /* must be on the rotating element */
.phrase  { backface-visibility: hidden; }  /* hide phrases when facing away */

/* 3 faces on the cylinder */
.phrase-0 { transform: rotateY(0deg)   translateZ(280px); }
.phrase-1 { transform: rotateY(120deg) translateZ(280px); }
.phrase-2 { transform: rotateY(240deg) translateZ(280px); }
```

### Progress pips
- Active pip = `Math.min(Math.round(currentRotation / 120), 2)`
- Pip 0 active: `currentRotation` 0–60°
- Pip 1 active: `currentRotation` 60–180°
- Pip 2 active: `currentRotation` 180–240°

### UI cues
- **"Keep scrolling" cue**: opacity 1 when progress < 0.06, fades to 0 above that. CSS `transition: opacity 0.5s ease`.
- **Eyebrow label**: `color: #C8C4BB` (muted) when progress ≤ 0.01 or ≥ 0.99, `color: #B8952A` (accent) in between. CSS `transition: color 0.6s`.

### Accessibility
- Outer wrapper has `aria-hidden="true"` — the phrases are decorative; the same brand messaging exists in the hero copy and features section below.

### Mobile
- On viewports < 768px, the section height is reduced to `250vh` and font size scales down via `clamp()`. The core sticky behaviour is unchanged. `400vh` on desktop, `250vh` on mobile is a deliberate UX choice — the animation completes faster on smaller screens.

### Phrases (confirmed)
1. "Train *Smarter.* / Coach Better."
2. "Your Gym. / *Your Style.*"
3. "Less Planning. / *More Coaching.*"

### Implementation
- New component: `components/landing/phrase-spinner.tsx` (`'use client'`)
- Inserted in `app/page.tsx` between the hero `<section>` and `<WodWalkthrough />`.

---

## 2. Upgraded WodCardsHero

### Card layout (z-index stacking)
| Slot | Day | Type | z-index | Default transform |
|------|-----|------|---------|-------------------|
| c1 (front) | Monday | Strength | 3 | `rotate(-1.5deg)` |
| c2 (mid)   | Tuesday | Metcon  | 2 | `rotate(3deg)` offset top 10px |
| c3 (back)  | Wednesday | Skills | 1 | `rotate(-4deg)` offset top 18px |

### Hover fan-out (pure CSS `:hover`, no JS)
```css
/* EXIT easing — on base .wod-card (controls hover-out) */
.wod-card {
  transition:
    transform  0.42s cubic-bezier(0.36, 0, 0.66, -0.25),
    opacity    0.35s ease,
    box-shadow 0.35s ease;
}

/* ENTER easing — on .card-stack:hover .wod-card (controls hover-in) */
.card-stack:hover .wod-card {
  transition:
    transform  0.52s cubic-bezier(0.34, 1.5, 0.64, 1),
    opacity    0.35s ease,
    box-shadow 0.4s ease;
}
```

Hover positions:
- c1: `transform: rotate(-1.5deg)` — identical to resting, no movement.
- c2: `transform: translateX(148px) rotate(9deg) translateY(-14px)` + `transition-delay: 0.04s`
- c3: `transform: translateX(-148px) rotate(-10deg) translateY(-10px)` + `transition-delay: 0.08s`

**Exit (hover-off) delays are reset to `0s`** — the base `.wod-card` transition has no delay, so collapse is immediate and simultaneous, giving the snappy overshoot feel without a staggered collapse.

### Float animation interaction
On hover, `animation: none` is applied to c1/c2/c3 via `.card-stack:hover .c*`. On hover-off, the float keyframe resumes. Because the base `.wod-card` exit transition fires first (0.42s), the card finishes its snap-back before the float animation re-applies — preventing any jump. The exit transition and float keyframe don't run simultaneously.

### Implementation
- Modify: `components/landing/wod-cards-hero.tsx` — add c3 card, convert to pure CSS hover.
- Add to `app/globals.css`:
  ```css
  @keyframes float-card-c {
    0%, 100% { transform: translateY(0px) rotate(-4deg); }
    50%       { transform: translateY(-4px) rotate(-4deg); }
  }
  .animate-float-c { animation: float-card-c 7s ease-in-out infinite 1.6s; }
  ```

---

## Files Changed

| File | Change |
|------|--------|
| `app/page.tsx` | Insert `<PhraseSpinner />` between hero and `<WodWalkthrough />` |
| `components/landing/phrase-spinner.tsx` | New client component |
| `components/landing/wod-cards-hero.tsx` | Add 3rd card, pure CSS hover fan |
| `app/globals.css` | Add `float-card-c` keyframe + `animate-float-c` class |
