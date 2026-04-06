# KOVA Landing Page Redesign — Design Spec
**Date:** 2026-03-24

## Overview
Replace the current `app/page.tsx` landing page with a high-end "Cinematic Dark" design. Split-layout hero with live app preview, stats bar, How It Works section, 6-feature grid, CTA, and footer. Single file change: `app/page.tsx` only.

## Design Direction
**Cinematic Dark** — pure black canvas (`#050505`), subtle radial gold glows, clean Inter sans-serif at scale, gold (`#D4AF37`) as the single accent. Inspired by Linear, Vercel, and Framer. All buttons are **sharp-cornered** (`border-radius: 0`) — no rounded corners anywhere on the page.

## Global Styles (in `<style>` tag)
```css
html { scroll-behavior: smooth; }
```
Anchor target sections use `scroll-margin-top: 64px` (matching nav height).

## Shared Section Label Style
Eyebrow label above each section title:
```css
font-size: 11px; letter-spacing: 4px; color: #D4AF37; text-transform: uppercase; margin-bottom: 16px;
```

## Logo
Use `<KovaLogo>` from `@/components/ui/kova-logo`:
- Nav: `<KovaLogo size="lg" />`
- Footer: `<KovaLogo size="sm" />`

## All Copy Strings

| Location | Text |
|---|---|
| Hero eyebrow | `AI-Powered Gym Programming` |
| Hero headline | `Train Smarter.` (line 1) / `Perform Better.` (line 2, in gold) |
| Hero subtext | `KOVA generates weekly programs tailored to your gym's coaching style — so you spend less time programming and more time coaching.` |
| Hero primary CTA | `Create Your Gym` → `/signup` |
| Hero ghost CTA | `Sign in →` → `/login` |
| Stat 1 | `500+` / `Gyms` |
| Stat 2 | `10K+` / `Members` |
| Stat 3 | `50K+` / `WODs Generated` |
| Stats bar item 1 | `< 30s` / `TO GENERATE A FULL WEEK` |
| Stats bar item 2 | `CrossFit + Hyrox` / `SUPPORTED GYM TYPES` |
| Stats bar item 3 | `Rx / Scaled / Beginner` / `AUTO-SCALED FOR EVERY ATHLETE` |
| How It Works label | `The process` |
| How It Works title | `From idea to published` (line 1) / `in three steps.` (line 2, in gold) |
| Features label | `What KOVA does` |
| Features title | `Everything your gym needs.` (line 1) / `Nothing it doesn't.` (line 2, in gold) |
| CTA headline | `Ready to elevate` (line 1) / `your gym?` (line 2, in gold) |
| CTA subtext | `Join gym owners already using KOVA to program smarter.` |
| CTA button | `Get Started Free` → `/signup` |
| Footer copyright | `© 2026 KOVA. All rights reserved.` |
| Nav Sign In | `Sign In` → `/login` |
| App preview title | `Weekly Program` |
| App preview badge | `PUBLISHED` |
| App preview date | `Week of Mar 24, 2026` (static string) |
| App preview button | `APPROVE & PUBLISH` |

---

## Page Sections

### 1. Nav
```
position: sticky; top: 0; z-index: 50;
background: rgba(5,5,5,0.9); backdrop-filter: blur(12px);
border-bottom: 1px solid rgba(255,255,255,0.06);
padding: 20px 64px;
display: flex; justify-content: space-between; align-items: center;
height: 64px; (set explicitly so scroll-margin-top matches)
```
- Left: `<KovaLogo size="lg" />`
- Right: nav links + Sign In button in a flex row with `gap: 32px; align-items: center`
  - "Features" `href="#features"`: `color: #666; font-size: 13px; text-decoration: none`
  - "How It Works" `href="#how-it-works"`: same style
  - "Sign In" `href="/login"`: `background: #D4AF37; color: #000; padding: 8px 20px; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-decoration: none; border-radius: 0`

### 2. Hero
```
max-width: 1200px; margin: 0 auto; padding: 100px 64px 80px;
display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;
position: relative;
```

Background glow — absolute div, `pointer-events: none`:
```
position: absolute; top: 0; right: 0;
width: 600px; height: 600px;
background: radial-gradient(circle at 70% 40%, rgba(212,175,55,0.07) 0%, transparent 60%);
```

**Left column:**
- Eyebrow: shared label style, text "AI-Powered Gym Programming"
- Headline `<h1>`:
  ```
  font-size: 58px; font-weight: 800; line-height: 1.02; letter-spacing: -2px; margin-bottom: 20px;
  ```
  "Train Smarter." on first line, `<br/>`, then `<span style="color:#D4AF37">Perform Better.</span>` on second line
- Subtext `<p>`:
  ```
  font-size: 16px; color: #9CA3AF; line-height: 1.7; max-width: 380px; margin-bottom: 36px;
  ```
- CTAs row: `display: flex; gap: 16px; align-items: center; margin-bottom: 48px`
  - Primary `<Link href="/signup">`:
    ```
    background: #D4AF37; color: #000; padding: 13px 28px;
    font-size: 13px; font-weight: 700; letter-spacing: 1px;
    text-decoration: none; border-radius: 0;
    ```
  - Ghost `<Link href="/login">`:
    ```
    color: #9CA3AF; font-size: 13px; text-decoration: none;
    border-bottom: 1px solid rgba(156,163,175,0.3); padding-bottom: 2px;
    ```
- Stats row: `display: flex; gap: 32px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.06)`
  - Stat number: `font-size: 22px; font-weight: 800; color: #D4AF37`
  - Stat label: `font-size: 11px; color: #555; letter-spacing: 1px; margin-top: 2px`

**Right column — app preview:**

Outer container `position: relative` (needed for the gold top-line div):
```
background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 10px; overflow: hidden;
box-shadow: 0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.05);
position: relative;
```

Top gold line — **use an absolute `<div>`** (not pseudo-element, to avoid needing a CSS class):
```
position: absolute; top: 0; left: 20%; right: 20%; height: 1px; z-index: 1;
background: linear-gradient(to right, transparent, rgba(212,175,55,0.4), transparent);
pointer-events: none;
```

App bar:
```
background: #0a0a0a; padding: 10px 16px; border-bottom: 1px solid #151515;
display: flex; justify-content: space-between; align-items: center;
```
- Title: `font-size: 11px; color: #fff; font-weight: 600`
- Badge: `background: rgba(212,175,55,0.15); color: #D4AF37; font-size: 9px; padding: 2px 8px; letter-spacing: 1px; font-weight: 700; border: 1px solid rgba(212,175,55,0.2); border-radius: 0`

Workout grid: `padding: 12px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px`

Each day card: `background: #111; border: 1px solid #1a1a1a; border-radius: 4px; padding: 8px`
- Day label: `font-size: 8px; color: #D4AF37; letter-spacing: 1px; font-weight: 700; margin-bottom: 6px`
- Three content lines: `height: 2px; background: #1e1e1e; border-radius: 1px; margin-bottom: 3px`; widths 100%, 80%, 60%
- Type tag: `display: inline-block; background: rgba(212,175,55,0.1); color: #D4AF37; font-size: 6px; padding: 1px 4px; border-radius: 2px; margin-top: 4px`
- Day → tag: MON=STRENGTH, TUE=METCON, WED=SKILL, THU=STRENGTH, FRI=METCON

App card footer: `padding: 8px 12px; border-top: 1px solid #111; display: flex; justify-content: space-between; align-items: center`
- Date text: `font-size: 9px; color: #444`
- Button: `background: #D4AF37; color: #000; font-size: 8px; padding: 4px 10px; font-weight: 700; letter-spacing: 1px; border-radius: 0`

### 3. Stats Bar
Full-width (no max-width). Layout:
```
padding: 24px 64px;
border-top: 1px solid rgba(255,255,255,0.05);
border-bottom: 1px solid rgba(255,255,255,0.05);
background: rgba(212,175,55,0.02);
display: flex; justify-content: center; gap: 80px; align-items: center;
```

Structure: `[stat] [divider] [stat] [divider] [stat]` — 5 flex children total.

Stat item: `text-align: center`
- Number `<div className="landing-stats-num">`: `font-size: 28px; font-weight: 800; color: #D4AF37; letter-spacing: -1px`
- Label `<div>`: `font-size: 11px; color: #555; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px`

Divider `<div className="divider">`: `width: 1px; height: 32px; background: rgba(255,255,255,0.06); flex-shrink: 0`

### 4. How It Works
```
id="how-it-works"
scroll-margin-top: 64px
max-width: 1200px; margin: 0 auto; padding: 100px 64px;
```
- Label: shared style, "The process"
- Title `<h2>`: `font-size: 40px; font-weight: 800; letter-spacing: -1px; margin-bottom: 60px`
  - Line 1: "From idea to published"
  - `<br/>`
  - Line 2: `<span style="color:#D4AF37">in three steps.</span>`

Grid container:
```
display: grid; grid-template-columns: repeat(3, 1fr);
gap: 2px; background: rgba(255,255,255,0.04);
overflow: visible;
```

Each step card: `background: #050505; padding: 40px 32px; position: relative`

- Step number: `font-size: 56px; font-weight: 900; color: rgba(212,175,55,0.08); letter-spacing: -2px; line-height: 1; margin-bottom: 20px`
- Icon box: `width: 40px; height: 40px; background: rgba(212,175,55,0.1); display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 16px`
- Title `<h3>`: `font-size: 17px; font-weight: 700; margin-bottom: 10px`
- Description `<p>`: `font-size: 14px; color: #9CA3AF; line-height: 1.7`

Connector (steps 1 and 2 only — add a `<div>` inside the card):
```
position: absolute; right: -2px; top: 50%; transform: translateY(-50%);
width: 3px; height: 40px; z-index: 1;
background: linear-gradient(to bottom, transparent, rgba(212,175,55,0.3), transparent);
```
The `right: -2px` places the connector visually centred over the 2px gap between cards. The grid has `overflow: visible` so it won't clip.

| # | Icon | Title | Description |
|---|------|-------|-------------|
| 01 | ⚡ | Generate | Tell KOVA your gym type and coaching style. The AI generates a full week of structured WODs — strength, metcons, and skill work — in under 30 seconds. |
| 02 | ✏️ | Review & Edit | Every workout is editable before it goes live. Swap movements, adjust loads, add coaching notes. Your program, refined by AI. |
| 03 | ✓ | Publish | Approve the week and your members instantly see it. Auto-scaled versions for Rx, Scaled, and Beginner athletes — generated automatically. |

### 5. Features
```
id="features"
scroll-margin-top: 64px
max-width: 1200px; margin: 0 auto; padding: 100px 64px;
```
- Label: shared style, "What KOVA does"
- Title `<h2>`: same style as How It Works title
  - Line 1: "Everything your gym needs."
  - `<br/>`
  - Line 2: `<span style="color:#D4AF37">Nothing it doesn't.</span>`

Grid: `display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; background: rgba(255,255,255,0.04)` — add `className="landing-grid landing-features-grid"` to this element.

Each feature card: `background: #050505; padding: 40px 32px`
- Icon box: same as step icon box
- Title `<h3>`: `font-size: 16px; font-weight: 700; margin-bottom: 10px`
- Description `<p>`: `font-size: 14px; color: #9CA3AF; line-height: 1.7`

| Icon | Title | Description |
|------|-------|-------------|
| ⚡ | AI Workout Generation | Generate a full week of WODs in seconds. KOVA learns your gym's style and keeps programming consistent — week after week. |
| 📅 | Class Scheduling | Set up recurring class slots, manage capacity, and let members book directly from their phone up to 2 days in advance. |
| 👥 | Member Management | Invite members, track attendance, and manage your gym community — all in one place. Waitlists handled automatically. |
| 🎯 | Auto-Scaling | Every WOD automatically scaled to Rx, Scaled, and Beginner. No more writing three versions of the same workout. |
| 🏋️ | CrossFit & Hyrox | Built-in programming logic for both CrossFit and Hyrox gyms. Switch gym type in settings — the AI adapts instantly. |
| ✏️ | Full Edit Control | AI generates, you approve. Edit any workout before publishing — structured editor or free text, your choice. |

### 6. CTA Section
```
text-align: center; padding: 100px 64px;
border-top: 1px solid rgba(255,255,255,0.05);
position: relative; overflow: hidden;
```
Background glow — absolute div:
```
position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
width: 600px; height: 300px; pointer-events: none;
background: radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 70%);
```

- Headline `<h2>`: `font-size: 52px; font-weight: 800; letter-spacing: -2px; margin-bottom: 16px; position: relative`
  - "Ready to elevate" + `<br/>` + `<span style="color:#D4AF37">your gym?</span>`
- Subtext `<p>`: `color: #9CA3AF; font-size: 16px; margin-bottom: 40px; position: relative`
- Button `<Link href="/signup">`:
  ```
  background: #D4AF37; color: #000; padding: 14px 36px;
  font-size: 14px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; text-decoration: none;
  display: inline-block; position: relative; border-radius: 0;
  ```

### 7. Footer
```
padding: 28px 64px; border-top: 1px solid rgba(255,255,255,0.05);
display: flex; justify-content: space-between; align-items: center;
```
Two children only — no nav links:
- Left: `<KovaLogo size="sm" />`
- Right: `<span style="font-size: 12px; color: #444">© 2026 KOVA. All rights reserved.</span>`

---

## Responsive Styles (`<style>` tag, mobile-first cascade)

Write as `max-width` media queries applied in this order (later rules override earlier):

```css
/* ── MOBILE: max-width 479px ── */
@media (max-width: 479px) {
  .landing-nav { padding: 16px 24px !important; }
  .landing-nav-link { display: none !important; }
  .landing-hero { padding: 60px 24px 60px !important; grid-template-columns: 1fr !important; }
  .landing-hero h1 { font-size: 38px !important; }
  .landing-hero p { font-size: 14px !important; }
  .landing-app-preview { display: none !important; }
  .landing-stats-bar { flex-direction: column !important; gap: 24px !important; padding: 32px 24px !important; }
  .landing-stats-bar .divider { display: none !important; }
  .landing-stats-num { font-size: 22px !important; }
  .landing-section { padding: 60px 24px !important; }
  .landing-grid { grid-template-columns: 1fr !important; }
  .landing-cta-headline { font-size: 36px !important; }
}

/* ── TABLET: 480px – 767px ── */
@media (min-width: 480px) and (max-width: 767px) {
  .landing-nav { padding: 16px 24px !important; }
  .landing-nav-link { display: none !important; }
  .landing-hero { padding: 60px 32px 60px !important; grid-template-columns: 1fr !important; }
  .landing-hero h1 { font-size: 44px !important; }
  .landing-app-preview { display: block !important; max-width: 480px !important; margin: 0 auto !important; }
  .landing-section { padding: 60px 32px !important; }
  .landing-grid { grid-template-columns: 1fr !important; }
  .landing-features-grid { grid-template-columns: 1fr 1fr !important; }
  .landing-cta-headline { font-size: 40px !important; }
}

/* ── SMALL DESKTOP: 768px – 1023px ── */
@media (min-width: 768px) and (max-width: 1023px) {
  .landing-hero { padding: 80px 40px !important; }
  .landing-hero h1 { font-size: 44px !important; }
  .landing-stats-bar { gap: 40px !important; padding: 24px 40px !important; }
  .landing-section { padding: 80px 40px !important; }
  .landing-features-grid { grid-template-columns: 1fr 1fr !important; }
}
```

Apply `className` props to elements as follows:
- `<nav>` → `className="landing-nav"`
- Nav anchor links → `className="landing-nav-link"`
- Hero section → `className="landing-hero"`
- App preview right column → `className="landing-app-preview"`
- Stats bar → `className="landing-stats-bar"`
- Stats bar number divs → `className="landing-stats-num"`
- Stats bar divider divs → `className="divider"`
- How It Works and Features sections → `className="landing-section"`
- All 2px-gap grids → `className="landing-grid"` (How It Works)
- Features 6-card grid specifically → `className="landing-grid landing-features-grid"`
- CTA headline → `className="landing-cta-headline"`

All inline `style` props are preserved alongside `className` props. The `!important` rules in the `<style>` tag override the inline styles at each breakpoint.

---

## Implementation Notes
- Server component, no `'use client'`
- Import: `import Link from 'next/link'` and `import { KovaLogo } from '@/components/ui/kova-logo'`
- No other imports needed
- The `<style>` tag goes inside the top-level `<div>` return, before the nav

## Constraints
- `app/page.tsx` only — no other files touched
- No Tailwind config changes
- No routing or auth changes
