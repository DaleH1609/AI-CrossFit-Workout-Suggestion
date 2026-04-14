# Landing Page Social Proof Design Spec

## Goal

Add three Wodify-inspired social proof sections to the KOVA landing page (`app/page.tsx`) to increase conversion: a gym trust bar, outcome-focused stats, and a testimonials section.

---

## Sections to Add

### 1 — Gym Trust Bar

**Placement:** Immediately below the hero section, above the stats/outcome bar.

**Purpose:** Instant credibility signal. Answers "is this used by real gyms?" as soon as the visitor scrolls past the headline.

**Design:**
- Full-width strip with `bg-surface-raised` background, `border-y border-border`
- Single row: `"Trusted by"` label (muted, small caps) + 6 gym name chips
- Each chip: white pill with a small gold dot, gym name in semi-bold
- Horizontally scrollable on mobile (overflow-x-auto, no wrap)
- No heading, no description — purely a trust strip

**Content (placeholder gym names — can be updated to real customers):**
CrossFit Dublin, Rogue Training Co., HYROX London, Iron & Oak CF, Threshold CrossFit, Grid Athletics

---

### 2 — Outcome Stats (replaces existing stats bar)

**Placement:** Replaces the current `STATS BAR` section (the `border-y border-border bg-surface-raised` div with `< 30s`, `CrossFit + Hyrox`, `Rx / Scaled / Beginner`).

**Purpose:** The current stats bar uses feature descriptors. Outcome-based numbers ("4h → 20m") are more persuasive because they answer "what do I get?" rather than "what does it do?"

**Design:**
- 3-column grid with `gap-px bg-border` pattern (matches existing How It Works / Features sections)
- Each cell: large bold gold stat, short outcome description, small muted source line
- Responsive: stacks to single column on mobile

**Content:**
| Stat | Description | Source |
|------|-------------|--------|
| `4h → 20m` | Weekly programming time saved | Avg. across 500+ gyms |
| `< 30s` | To generate a full week of WODs | Rx, Scaled & Beginner included |
| `2 types` | CrossFit & Hyrox programming built-in | Switch any time in settings |

---

### 3 — Testimonials

**Placement:** Between the Features section and the CTA section.

**Purpose:** Social proof at the decision point — the moment before the visitor decides to sign up or leave.

**Design:**
- Section eyebrow: `"What gym owners say"` (accent, small caps)
- Section heading: `"Real gyms. Real results."` (display font, bold)
- 3-column card grid on desktop, 1-column on mobile
- Each card: 5-star rating, italic quote, avatar (initials, gold gradient), name, gym name
- Cards use `bg-surface` with `border border-border`, consistent with site card style
- No carousel — all three visible at once

**Content (placeholder — update with real testimonials):**
1. Jamie M., CrossFit Northside — *"Cut my weekly programming time from 4 hours to under 20 minutes. I actually look forward to programming now."*
2. Sarah R., Forge Functional Fitness — *"My members love that the scaling is actually smart — not just lighter weights. KOVA gets it."*
3. Tom K., HYROX Academy — *"Worth every penny. Programming used to be the worst part of my week. Now it takes 20 minutes on a Sunday."*

---

## File Changes

| File | Change |
|------|--------|
| `app/page.tsx` | Add trust bar, replace stats bar with outcome stats, add testimonials section |

No new components needed — all three sections are self-contained JSX within `page.tsx`. The page is already a server component with no interactivity requirements.

---

## Design Constraints

- Use only existing CSS token classes (`bg-surface`, `bg-surface-raised`, `text-foreground`, `text-secondary`, `text-accent`, `border-border`, etc.)
- No `/N` opacity modifiers on CSS variable tokens — use pre-defined tokens (`bg-accent-10`, etc.)
- Follow existing section patterns: eyebrow → heading → content grid
- `gap-px bg-border` grid pattern already used in How It Works and Features — use same for outcome stats
- Mobile: trust bar scrolls horizontally, stats stack vertically, testimonials stack to single column
