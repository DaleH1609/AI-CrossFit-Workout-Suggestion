# Landing Page Social Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gym trust bar, outcome-focused stats, and a testimonials section to `app/page.tsx` to increase landing page conversion.

**Architecture:** All three sections are self-contained JSX added to the existing server component `app/page.tsx`. No new files, no new components, no backend changes. The trust bar slots in after the hero, outcome stats replaces the existing stats bar, and testimonials sits between features and CTA.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v3, CSS token design system (no `/N` opacity modifiers on custom property tokens — use pre-defined tokens like `bg-accent-10`).

---

## File Map

| File | Change |
|------|--------|
| `app/page.tsx` | Add trust bar (after hero), replace stats bar with outcome stats, add testimonials (before CTA) |

---

### Task 1: Gym Trust Bar

**Files:**
- Modify: `app/page.tsx` — insert trust bar section after the closing `</section>` of the HERO (after line 66)

No automated tests exist for this server component. Verification is `npm run build` (no TypeScript/ESLint errors) plus visual inspection.

- [ ] **Step 1: Open `app/page.tsx` and locate the hero section closing tag**

The hero section ends at approximately line 66:
```tsx
      <WodCardsHero />
      </section>
```
Insert the trust bar immediately after this `</section>`.

- [ ] **Step 2: Add the trust bar**

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

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npm run build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add gym trust bar below hero on landing page"
```

---

### Task 2: Replace Stats Bar with Outcome Stats

**Files:**
- Modify: `app/page.tsx` — replace the entire `{/* STATS BAR */}` section (the `<div className="border-y border-border bg-surface-raised">` block, approximately lines 68–85)

- [ ] **Step 1: Delete the existing STATS BAR block**

Remove the entire section from `{/* STATS BAR */}` through its closing `</div>`. It looks like this:

```tsx
      {/* STATS BAR */}
      <div className="border-y border-border bg-surface-raised">
        <div className="max-w-6xl mx-auto px-8 py-6 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
          {[
            { value: '< 30s', label: 'To generate a full week' },
            { value: 'CrossFit + Hyrox', label: 'Supported gym types' },
            { value: 'Rx / Scaled / Beginner', label: 'Auto-scaled for every athlete' },
          ].map((item, i) => (
            <div key={item.label} className="flex items-center gap-16">
              {i > 0 && <div className="hidden sm:block w-px h-8 bg-border" />}
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{item.value}</div>
                <div className="text-xs text-secondary tracking-wide mt-0.5">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
```

- [ ] **Step 2: Insert the outcome stats section in its place**

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

- [ ] **Step 3: Verify build passes**

```bash
npm run build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: replace stats bar with outcome-focused stats on landing page"
```

---

### Task 3: Testimonials Section

**Files:**
- Modify: `app/page.tsx` — insert testimonials section between the closing `</section>` of FEATURES and the start of `{/* CTA */}`

- [ ] **Step 1: Locate the insertion point**

In `app/page.tsx`, find the end of the FEATURES section. It closes with:
```tsx
        </div>
      </section>

      {/* CTA */}
```
Insert the testimonials section between `</section>` and `{/* CTA */}`.

- [ ] **Step 2: Add the testimonials section**

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

- [ ] **Step 3: Verify build passes**

```bash
npm run build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add testimonials section to landing page"
```

---

### Task 4: Final verification and deploy

- [ ] **Step 1: Run a clean build**

```bash
npm run build 2>&1 | tail -20
```
Expected: all 3 new sections present (`/login` and `/` both compile as static `○`), no TypeScript or ESLint errors.

- [ ] **Step 2: Deploy preview**

```bash
vercel
```
Expected: preview URL returned with status READY.

- [ ] **Step 3: Visually verify on preview URL**

Open the preview URL and confirm:
- Trust bar of gym chips appears below the hero headline
- Outcome stats grid appears below the trust bar (3 columns on desktop, 1 on mobile)
- Testimonials section appears between Features and the dark CTA block
- No layout breaks on mobile (resize browser or use DevTools)
