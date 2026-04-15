# Landing Page Social Proof Design Spec

## Goal

Add three Wodify-inspired social proof sections to the KOVA landing page (`app/page.tsx`) to increase conversion: a gym trust bar, outcome-focused stats, and a testimonials section.

---

## Sections to Add

### 1 — Gym Trust Bar

**Placement:** Immediately below the hero section, above the outcome stats. Uses `border-b border-border` only (no top border — hero has no bottom border, so a top border here would create a double-border artifact).

**Purpose:** Instant credibility signal — answers "is this used by real gyms?" as soon as the visitor scrolls past the headline.

**Design:**
- Full-width strip with `bg-surface-raised` background, `border-b border-border`
- Single row: `"Trusted by"` label (`text-secondary text-xs uppercase tracking-widest`) + 6 gym name chips
- Each chip: `bg-background border border-border rounded-btn px-3 py-1 text-xs font-semibold text-foreground` — uses `bg-background` so it adapts correctly in dark mode (white in light, dark in dark)
- Gold dot: `w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0` — uses `bg-accent` token
- Horizontally scrollable on mobile: outer div `overflow-x-auto`, inner flex `flex-nowrap`
- No heading, no description — purely a trust strip, `py-4` vertical padding

**Content (placeholder gym names):**
CrossFit Dublin, Rogue Training Co., HYROX London, Iron & Oak CF, Threshold CrossFit, Grid Athletics

**Hero mini-stats:** The hero section already contains "500+ Gyms / 10K+ Members / 50K+ WODs" inline stats. These are intentionally kept — they anchor the hero copy. The trust bar is a separate visual strip and does not create redundancy (hero stats = scale, trust bar = identity of users).

---

### 2 — Outcome Stats (replaces existing stats bar)

**Placement:** Replaces the existing `STATS BAR` section entirely. Uses `border-b border-border` only (no top border — trust bar's bottom border immediately precedes it; adding a top border would double up).

**Purpose:** The current stats bar uses feature descriptors. Outcome-based numbers ("4h → 20m") answer "what do I get?" rather than "what does it do?"

**Design:**
- Full-width `<section>` with `bg-surface border-b border-border` containing an inner `<div className="max-w-6xl mx-auto px-8 py-16">` — matches the How It Works / Features section structure exactly (full-width background fill, constrained content)
- Inside the inner div: a 3-column `gap-px bg-border` grid (same `grid grid-cols-1 md:grid-cols-3 gap-px bg-border` pattern)
- Each cell `bg-surface p-10`:
  - Large bold stat: `text-3xl font-black text-accent`
  - Description: `text-sm text-foreground font-medium mt-2`
  - Source line: `text-xs text-secondary mt-1` — always `text-secondary`, never `text-foreground-50` or `text-muted`
- Responsive: `grid-cols-1 md:grid-cols-3`

**Content:**
| Stat | Description | Source |
|------|-------------|--------|
| `4h → 20m` | Weekly programming time saved | Avg. across 500+ gyms |
| `< 30s` | To generate a full week of WODs | Rx, Scaled & Beginner included |
| `2 types` | CrossFit & Hyrox built-in | Switch any time in settings |

---

### 3 — Testimonials

**Placement:** Between the Features section and the CTA section. No `id` attribute needed — this section is not linked from the nav, and the nav is not updated. The nav currently links to `#features` and `#how-it-works` only; testimonials is a supporting section.

**Purpose:** Social proof at the decision point — just before the visitor decides to sign up or leave.

**Design:**
- Section eyebrow: `text-xs font-semibold tracking-widest text-accent uppercase mb-4`
- Section heading: `font-display text-4xl font-bold text-foreground tracking-tight mb-14` — matches How It Works / Features headings
- 3-column card grid: `grid-cols-1 md:grid-cols-3 gap-6`
- Each card: `bg-surface border border-border rounded-card p-8`
  - Stars: `text-accent text-sm mb-3` (5× `★`)
  - Quote: `text-sm text-foreground leading-relaxed mb-5 italic`
  - Author row: flex gap-3, avatar + name stack
  - Avatar: `w-9 h-9 rounded-full bg-accent-10 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0` — solid token, no gradient (gradient not achievable within token system)
  - Name: `text-sm font-semibold text-foreground`
  - Gym: `text-xs text-secondary mt-0.5`

**Content (placeholder — replace with real testimonials):**
1. **JM** — Jamie M., CrossFit Northside — *"Cut my weekly programming time from 4 hours to under 20 minutes. I actually look forward to programming now."*
2. **SR** — Sarah R., Forge Functional Fitness — *"My members love that the scaling is actually smart — not just lighter weights. KOVA gets it."*
3. **TK** — Tom K., HYROX Academy — *"Worth every penny. Programming used to be the worst part of my week. Now it takes 20 minutes on a Sunday."*

---

## File Changes

| File | Change |
|------|--------|
| `app/page.tsx` | Add trust bar after hero, replace stats bar with outcome stats, add testimonials before CTA |

No new components — all three sections are self-contained JSX within `page.tsx`.

---

## Design Constraints

- Use only existing CSS token classes (`bg-surface`, `bg-surface-raised`, `bg-background`, `text-foreground`, `text-secondary`, `text-accent`, `border-border`, `rounded-btn`, `rounded-card`, `bg-accent-10`, etc.)
- No `/N` opacity modifiers on CSS variable tokens — these silently fail in Tailwind v3 with CSS custom properties
- No inline gradients in testimonial avatars — use `bg-accent-10 text-accent` (solid tokens)
- Follow existing section patterns: eyebrow label → heading → content grid
- `gap-px bg-border` grid pattern used in How It Works and Features — use same for outcome stats cells
- Border strategy: each new section uses `border-b border-border` only (no `border-t`) to avoid double-borders between adjacent sections
- Mobile: trust bar scrolls horizontally (`overflow-x-auto flex-nowrap`), outcome stats and testimonials stack to single column
