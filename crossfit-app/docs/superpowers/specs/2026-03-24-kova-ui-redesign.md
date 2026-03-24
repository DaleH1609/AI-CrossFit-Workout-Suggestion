# KOVA UI Redesign — Design Spec
**Date:** 2026-03-24

## Overview
Rebrand the app from "CrossFit Generator" to **KOVA** and build a landing page with full branding applied across auth pages and the app sidebar.

## Brand Identity
- **Name:** KOVA
- **Logo mark:** Gold hexagon (`clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)`) in `#D4AF37`, paired with "KOVA" in bold spaced caps
- **Tagline:** "Train Smarter. Perform Better."
- **Color palette:** Existing — background `#0A0A0A`, surface `#141414`, accent gold `#D4AF37`, secondary `#9CA3AF`
- **Fonts:** Existing — Playfair Display (display), Inter (body)

## Pages & Changes

### 1. Landing Page (`app/page.tsx`)
Currently returns `null`. Replace with a full marketing page.

**Sections (top to bottom):**

**Nav**
- Left: hexagon logo mark + "KOVA" wordmark
- Right: "Features" link (anchors to features section), "For Gyms" link (anchors to features section), "Sign In" gold CTA button → `/login`

**Hero**
- Eyebrow: "AI-Powered Gym Programming" in small gold uppercase
- Headline: "Train Smarter. Perform Better." — large (72px), "Perform Better." in gold
- Subtext: "KOVA generates weekly CrossFit programs tailored to your gym's coaching style — so you spend less time programming and more time coaching."
- CTAs: Primary "CREATE YOUR GYM" → `/signup`, Ghost "Sign in →" → `/login`

**Features Section**
- Section label: "What KOVA does"
- Title: "Everything your gym needs. Nothing it doesn't."
- 3-column grid with gold border separator:
  1. ⚡ AI Workout Generation — "Generate a full week of WODs in seconds. KOVA learns your gym's style and keeps programming consistent."
  2. 📅 Class Scheduling — "Set up recurring class slots, manage capacity, and let members book directly from their phone."
  3. 👥 Member Management — "Invite members, track attendance, and manage your gym community — all in one place."

**CTA Section**
- Headline: "Ready to elevate your gym?" with "your gym?" in gold
- Subtext: "Join gym owners already using KOVA to program smarter."
- Button: "GET STARTED FREE" → `/signup`

**Footer**
- Left: KOVA logo mark (small) + wordmark
- Right: "© 2026 KOVA. All rights reserved."

### 2. Login Page (`app/(auth)/login/page.tsx`)
- Add KOVA hexagon logo mark + "KOVA" wordmark centered above the form card
- No other changes to form functionality

### 3. Signup Page (`app/(auth)/signup/page.tsx`)
- Add KOVA hexagon logo mark + "KOVA" wordmark centered above the form card
- No other changes to form functionality

### 4. Owner Sidebar (`components/layout/owner-sidebar.tsx`)
- Replace `<h1>CrossFit HQ</h1>` with the KOVA hexagon logo mark + "KOVA" wordmark
- Same gold hexagon SVG/CSS shape used consistently

### 5. App Metadata (`app/layout.tsx`)
- Update `title` from `'CrossFit Generator'` to `'KOVA'`

## Logo Mark Component
Create a reusable `<KovaLogo>` component at `components/ui/kova-logo.tsx` that accepts a `size` prop (`sm` | `md` | `lg`). Used in nav, sidebar, auth pages, and footer. Renders the hexagon mark + wordmark side by side.

## Constraints
- Do not change any app functionality, routing, or database logic
- Do not change Tailwind config — use existing color tokens
- Keep all existing form logic and validation intact
- Landing page should be a server component (no `'use client'`)
