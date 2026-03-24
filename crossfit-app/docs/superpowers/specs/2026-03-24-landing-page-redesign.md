# KOVA Landing Page Redesign — Design Spec
**Date:** 2026-03-24

## Overview
Replace the current `app/page.tsx` landing page with a high-end "Cinematic Dark" design. Split-layout hero with live app preview, stats bar, How It Works section, 6-feature grid, CTA, and footer.

## Design Direction
**Cinematic Dark** — pure black canvas (#050505), subtle radial gold glows, clean Inter sans-serif at scale, gold (#D4AF37) as the single accent. Inspired by Linear, Vercel, and Framer. Feels like premium software, not a fitness blog.

## Page Sections (top to bottom)

### 1. Nav
- Frosted glass: `background: rgba(5,5,5,0.9); backdrop-filter: blur(12px)`
- Sticky, `border-bottom: 1px solid rgba(255,255,255,0.06)`
- Left: KOVA hexagon logo + wordmark
- Right: "Features" link, "How It Works" link (both anchor links), "Sign In" gold CTA button → `/login`

### 2. Hero
Two-column grid (`1fr 1fr`, 64px gap), vertically centered, `max-width: 1200px`.

**Left column — text:**
- Eyebrow: `AI-Powered Gym Programming` — 11px, gold, 4px letter-spacing, uppercase
- Headline: `Train Smarter. / Perform Better.` — 58px, weight 800, -2px letter-spacing. "Perform Better." in gold
- Subtext: `KOVA generates weekly programs tailored to your gym's coaching style — so you spend less time programming and more time coaching.` — 16px, #9CA3AF
- CTAs: Primary `CREATE YOUR GYM` → `/signup`, ghost `Sign in →` → `/login`
- Stats row (below a thin divider): `500+` Gyms | `10K+` Members | `50K+` WODs Generated — gold numbers, grey labels

**Right column — app preview:**
- Dark card (`background: #0d0d0d`, `border: 1px solid #1a1a1a`, `border-radius: 10px`)
- Top gold line glow: `linear-gradient(to right, transparent, rgba(212,175,55,0.4), transparent)` at top edge
- App bar: "Weekly Program" title + gold "PUBLISHED" badge
- 5-column workout grid (Mon–Fri): each card shows day label in gold, 3 skeleton content lines, a type tag (STRENGTH / METCON / SKILL)
- App footer: "Week of [date]" + gold "APPROVE & PUBLISH" button
- Drop shadow: `box-shadow: 0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.05)`

**Background:** Radial gold glow centered on hero right side — `radial-gradient(circle at 70% 40%, rgba(212,175,55,0.07) 0%, transparent 60%)`

### 3. Stats Bar
Full-width bar, `border-top/bottom: 1px solid rgba(255,255,255,0.05)`, `background: rgba(212,175,55,0.02)`.
Three stats separated by thin vertical dividers:
1. `< 30s` — TO GENERATE A FULL WEEK
2. `CrossFit + Hyrox` — SUPPORTED GYM TYPES
3. `Rx / Scaled / Beginner` — AUTO-SCALED FOR EVERY ATHLETE

Stats labels: 11px, #555, 1px letter-spacing, uppercase.

### 4. How It Works
`id="how-it-works"`, `max-width: 1200px`, `padding: 100px 64px`.

- Section label: `The process` — gold, 11px, 4px letter-spacing
- Title: `From idea to published / in three steps.` — 40px, weight 800. "in three steps." in gold

Three-column grid (`repeat(3, 1fr)`, 2px gap, `background: rgba(255,255,255,0.04)` as grid lines):

| Step | Icon | Title | Description |
|------|------|-------|-------------|
| 01 | ⚡ | Generate | Tell KOVA your gym type and coaching style. The AI generates a full week of structured WODs — strength, metcons, and skill work — in under 30 seconds. |
| 02 | ✏️ | Review & Edit | Every workout is editable before it goes live. Swap movements, adjust loads, add coaching notes. Your program, refined by AI. |
| 03 | ✓ | Publish | Approve the week and your members instantly see it. Auto-scaled versions for Rx, Scaled, and Beginner athletes — generated automatically. |

Each step: oversized muted number (`56px, rgba(212,175,55,0.08)`), icon box, title, description. Thin gold connector between steps.

### 5. Features
`id="features"`, `max-width: 1200px`, `padding: 100px 64px`.

- Section label: `What KOVA does`
- Title: `Everything your gym needs. / Nothing it doesn't.` — "Nothing it doesn't." in gold

6-card grid (`repeat(3, 1fr)`, same 2px gap / gold border treatment as How It Works):

| Icon | Title | Description |
|------|-------|-------------|
| ⚡ | AI Workout Generation | Generate a full week of WODs in seconds. KOVA learns your gym's style and keeps programming consistent — week after week. |
| 📅 | Class Scheduling | Set up recurring class slots, manage capacity, and let members book directly from their phone up to 2 days in advance. |
| 👥 | Member Management | Invite members, track attendance, and manage your gym community — all in one place. Waitlists handled automatically. |
| 🎯 | Auto-Scaling | Every WOD automatically scaled to Rx, Scaled, and Beginner. No more writing three versions of the same workout. |
| 🏋️ | CrossFit & Hyrox | Built-in programming logic for both CrossFit and Hyrox gyms. Switch gym type in settings — the AI adapts instantly. |
| ✏️ | Full Edit Control | AI generates, you approve. Edit any workout before publishing — structured editor or free text, your choice. |

### 6. CTA Section
`text-align: center`, `padding: 100px 64px`, `border-top: 1px solid rgba(255,255,255,0.05)`.
- Background radial glow: `rgba(212,175,55,0.06)`
- Headline: `Ready to elevate / your gym?` — 52px, weight 800. "your gym?" in gold
- Subtext: `Join gym owners already using KOVA to program smarter.` — #9CA3AF
- Button: `GET STARTED FREE` → `/signup` — gold, 16px padding

### 7. Footer
- Left: small KOVA logo (hex + wordmark)
- Right: `© 2026 KOVA. All rights reserved.` — #444, 12px

## Responsive Behaviour
- `< 768px`: Hero stacks to single column (text above, app preview below). App preview hidden on very small screens (< 480px). Nav links hidden, keep logo + Sign In. All section paddings reduce to 24px horizontal.
- `768px–1024px`: Hero remains split but smaller fonts (headline 44px). Features grid goes to 2 columns.

## Implementation Notes
- Server component (`no 'use client'`) — pure markup, no state
- Use inline styles for non-Tailwind elements (as per existing codebase pattern for landing page)
- Add `<style>` tag for media queries and hover states (as per the responsive approach established in Wave 1)
- The app preview is a static HTML mockup — not a live component
- Stats (500+ gyms, 10K+ members, 50K+ WODs) are aspirational placeholders — easy to update later
- Anchor links: `#features` → features section, `#how-it-works` → how it works section

## Constraints
- Do not change any routing, auth, or API logic
- Do not modify Tailwind config
- Keep all existing functionality intact
- File: `app/page.tsx` only
