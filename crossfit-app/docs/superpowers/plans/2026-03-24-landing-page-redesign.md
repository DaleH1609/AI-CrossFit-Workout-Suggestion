# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `app/page.tsx` with a high-end "Cinematic Dark" landing page featuring a split hero with app preview, stats bar, How It Works steps, 6-feature grid, CTA, and footer.

**Architecture:** Single server component file — no client state, no API calls. All layout uses inline styles with a `<style>` tag for media queries and responsive breakpoints. The only component imported is the existing `<KovaLogo>`.

**Tech Stack:** Next.js 14 (App Router, server component), TypeScript, Next.js `<Link>`, existing `<KovaLogo>` component.

---

## File Map

| Action | File | What changes |
|--------|------|--------------|
| Modify | `app/page.tsx` | Complete rewrite — new layout, sections, styles |

That's it. One file. No other files touched.

---

### Task 1: Scaffold the page structure with nav and global styles

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Read the current file**

```bash
cat app/page.tsx
```

Understand the current imports, components, and structure before overwriting.

- [ ] **Step 2: Replace the file with the scaffold**

Rewrite `app/page.tsx` to a server component with:
- Correct imports: `import Link from 'next/link'` and `import { KovaLogo } from '@/components/ui/kova-logo'`
- No `'use client'` directive
- A top-level `<div>` with `style={{ background: '#050505', color: '#fff', minHeight: '100vh', fontFamily: 'var(--font-inter)' }}`
- A `<style>` tag as the first child — paste in the full responsive CSS from the spec:

```tsx
<style>{`
  html { scroll-behavior: smooth; }

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

  @media (min-width: 768px) and (max-width: 1023px) {
    .landing-hero { padding: 80px 40px !important; }
    .landing-hero h1 { font-size: 44px !important; }
    .landing-stats-bar { gap: 40px !important; padding: 24px 40px !important; }
    .landing-section { padding: 80px 40px !important; }
    .landing-features-grid { grid-template-columns: 1fr 1fr !important; }
  }
`}</style>
```

- Then add a placeholder `{/* sections go here */}` comment
- Return the component

- [ ] **Step 3: Add the Nav**

Inside the top-level `<div>`, after the `<style>` tag, add the nav:

```tsx
<nav className="landing-nav" style={{
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '20px 64px', borderBottom: '1px solid rgba(255,255,255,0.06)',
  position: 'sticky', top: 0, zIndex: 50, height: 64,
  background: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(12px)',
}}>
  <KovaLogo size="lg" />
  <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
    <a href="#features" className="landing-nav-link" style={{ color: '#666', fontSize: 13, textDecoration: 'none' }}>Features</a>
    <a href="#how-it-works" className="landing-nav-link" style={{ color: '#666', fontSize: 13, textDecoration: 'none' }}>How It Works</a>
    <Link href="/login" style={{
      background: '#D4AF37', color: '#000', padding: '8px 20px',
      fontSize: 12, fontWeight: 700, letterSpacing: 1, textDecoration: 'none',
    }}>Sign In</Link>
  </div>
</nav>
```

- [ ] **Step 4: Verify the page loads without errors**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npm run build 2>&1 | tail -20
```

Expected: Build succeeds (no TypeScript or import errors).

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: landing page scaffold — nav and global styles"
```

---

### Task 2: Hero section

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add the Hero section after the nav**

```tsx
{/* HERO */}
<section className="landing-hero" style={{
  maxWidth: 1200, margin: '0 auto', padding: '100px 64px 80px',
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center',
  position: 'relative',
}}>
  {/* Background glow */}
  <div style={{
    position: 'absolute', top: 0, right: 0, width: 600, height: 600,
    background: 'radial-gradient(circle at 70% 40%, rgba(212,175,55,0.07) 0%, transparent 60%)',
    pointerEvents: 'none',
  }} />

  {/* Left: text */}
  <div style={{ position: 'relative', zIndex: 1 }}>
    <p style={{ fontSize: 11, letterSpacing: 4, color: '#D4AF37', textTransform: 'uppercase', marginBottom: 20 }}>
      AI-Powered Gym Programming
    </p>
    <h1 style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, marginBottom: 20 }}>
      Train Smarter.<br />
      <span style={{ color: '#D4AF37' }}>Perform Better.</span>
    </h1>
    <p style={{ fontSize: 16, color: '#9CA3AF', lineHeight: 1.7, maxWidth: 380, marginBottom: 36 }}>
      KOVA generates weekly programs tailored to your gym&apos;s coaching style — so you spend less time programming and more time coaching.
    </p>
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 48 }}>
      <Link href="/signup" style={{
        background: '#D4AF37', color: '#000', padding: '13px 28px',
        fontSize: 13, fontWeight: 700, letterSpacing: 1, textDecoration: 'none', textTransform: 'uppercase',
      }}>Create Your Gym</Link>
      <Link href="/login" style={{
        color: '#9CA3AF', fontSize: 13, textDecoration: 'none',
        borderBottom: '1px solid rgba(156,163,175,0.3)', paddingBottom: 2,
      }}>Sign in →</Link>
    </div>
    {/* Stats */}
    <div style={{ display: 'flex', gap: 32, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {[
        { value: '500+', label: 'Gyms' },
        { value: '10K+', label: 'Members' },
        { value: '50K+', label: 'WODs Generated' },
      ].map(s => (
        <div key={s.label}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37' }}>{s.value}</div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  </div>

  {/* Right: App preview */}
  <div className="landing-app-preview" style={{
    background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 10,
    overflow: 'hidden', position: 'relative', zIndex: 1,
    boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.05)',
  }}>
    {/* Top gold line */}
    <div style={{
      position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, zIndex: 1,
      background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.4), transparent)',
      pointerEvents: 'none',
    }} />
    {/* App bar */}
    <div style={{
      background: '#0a0a0a', padding: '10px 16px', borderBottom: '1px solid #151515',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>Weekly Program</span>
      <span style={{
        background: 'rgba(212,175,55,0.15)', color: '#D4AF37', fontSize: 9,
        padding: '2px 8px', letterSpacing: 1, fontWeight: 700,
        border: '1px solid rgba(212,175,55,0.2)',
      }}>PUBLISHED</span>
    </div>
    {/* Workout grid */}
    <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
      {[
        { day: 'MON', tag: 'STRENGTH' },
        { day: 'TUE', tag: 'METCON' },
        { day: 'WED', tag: 'SKILL' },
        { day: 'THU', tag: 'STRENGTH' },
        { day: 'FRI', tag: 'METCON' },
      ].map(({ day, tag }) => (
        <div key={day} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 4, padding: 8 }}>
          <div style={{ fontSize: 8, color: '#D4AF37', letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>{day}</div>
          <div style={{ height: 2, background: '#1e1e1e', borderRadius: 1, marginBottom: 3 }} />
          <div style={{ height: 2, background: '#1e1e1e', borderRadius: 1, marginBottom: 3, width: '80%' }} />
          <div style={{ height: 2, background: '#1e1e1e', borderRadius: 1, width: '60%' }} />
          <div style={{
            display: 'inline-block', background: 'rgba(212,175,55,0.1)', color: '#D4AF37',
            fontSize: 6, padding: '1px 4px', borderRadius: 2, marginTop: 4,
          }}>{tag}</div>
        </div>
      ))}
    </div>
    {/* App footer */}
    <div style={{
      padding: '8px 12px', borderTop: '1px solid #111',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{ fontSize: 9, color: '#444' }}>Week of Mar 24, 2026</span>
      <span style={{
        background: '#D4AF37', color: '#000', fontSize: 8,
        padding: '4px 10px', fontWeight: 700, letterSpacing: 1,
      }}>APPROVE &amp; PUBLISH</span>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: landing page hero with app preview"
```

---

### Task 3: Stats Bar

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add stats bar after the hero section**

```tsx
{/* STATS BAR */}
<div className="landing-stats-bar" style={{
  padding: '24px 64px',
  borderTop: '1px solid rgba(255,255,255,0.05)',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  background: 'rgba(212,175,55,0.02)',
  display: 'flex', justifyContent: 'center', gap: 80, alignItems: 'center',
}}>
  {[
    { value: '< 30s', label: 'TO GENERATE A FULL WEEK' },
    null, // divider
    { value: 'CrossFit + Hyrox', label: 'SUPPORTED GYM TYPES' },
    null, // divider
    { value: 'Rx / Scaled / Beginner', label: 'AUTO-SCALED FOR EVERY ATHLETE' },
  ].map((item, i) =>
    item === null ? (
      <div key={i} className="divider" style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
    ) : (
      <div key={item.label} style={{ textAlign: 'center' }}>
        <div className="landing-stats-num" style={{ fontSize: 28, fontWeight: 800, color: '#D4AF37', letterSpacing: -1 }}>{item.value}</div>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{item.label}</div>
      </div>
    )
  )}
</div>
```

- [ ] **Step 2: Build check and commit**

```bash
npm run build 2>&1 | tail -10
git add app/page.tsx
git commit -m "feat: landing page stats bar"
```

---

### Task 4: How It Works section

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add How It Works after the stats bar**

```tsx
{/* HOW IT WORKS */}
<section id="how-it-works" className="landing-section" style={{
  maxWidth: 1200, margin: '0 auto', padding: '100px 64px', scrollMarginTop: 64,
}}>
  <p style={{ fontSize: 11, letterSpacing: 4, color: '#D4AF37', textTransform: 'uppercase', marginBottom: 16 }}>
    The process
  </p>
  <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, marginBottom: 60 }}>
    From idea to published<br />
    <span style={{ color: '#D4AF37' }}>in three steps.</span>
  </h2>
  <div className="landing-grid" style={{
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 2, background: 'rgba(255,255,255,0.04)', overflow: 'visible',
  }}>
    {[
      {
        num: '01', icon: '⚡', title: 'Generate',
        desc: "Tell KOVA your gym type and coaching style. The AI generates a full week of structured WODs — strength, metcons, and skill work — in under 30 seconds.",
        connector: true,
      },
      {
        num: '02', icon: '✏️', title: 'Review & Edit',
        desc: "Every workout is editable before it goes live. Swap movements, adjust loads, add coaching notes. Your program, refined by AI.",
        connector: true,
      },
      {
        num: '03', icon: '✓', title: 'Publish',
        desc: "Approve the week and your members instantly see it. Auto-scaled versions for Rx, Scaled, and Beginner athletes — generated automatically.",
        connector: false,
      },
    ].map(step => (
      <div key={step.num} style={{ background: '#050505', padding: '40px 32px', position: 'relative' }}>
        <div style={{ fontSize: 56, fontWeight: 900, color: 'rgba(212,175,55,0.08)', letterSpacing: -2, lineHeight: 1, marginBottom: 20 }}>
          {step.num}
        </div>
        <div style={{
          width: 40, height: 40, background: 'rgba(212,175,55,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, marginBottom: 16,
        }}>{step.icon}</div>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{step.title}</h3>
        <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.7 }}>{step.desc}</p>
        {step.connector && (
          <div style={{
            position: 'absolute', right: -2, top: '50%', transform: 'translateY(-50%)',
            width: 3, height: 40, zIndex: 1,
            background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,0.3), transparent)',
          }} />
        )}
      </div>
    ))}
  </div>
</section>
```

- [ ] **Step 2: Build check and commit**

```bash
npm run build 2>&1 | tail -10
git add app/page.tsx
git commit -m "feat: landing page how it works section"
```

---

### Task 5: Features section

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add Features after How It Works**

```tsx
{/* FEATURES */}
<section id="features" className="landing-section" style={{
  maxWidth: 1200, margin: '0 auto', padding: '100px 64px', scrollMarginTop: 64,
}}>
  <p style={{ fontSize: 11, letterSpacing: 4, color: '#D4AF37', textTransform: 'uppercase', marginBottom: 16 }}>
    What KOVA does
  </p>
  <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, marginBottom: 60 }}>
    Everything your gym needs.<br />
    <span style={{ color: '#D4AF37' }}>Nothing it doesn&apos;t.</span>
  </h2>
  <div className="landing-grid landing-features-grid" style={{
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 2, background: 'rgba(255,255,255,0.04)',
  }}>
    {[
      { icon: '⚡', title: 'AI Workout Generation', desc: "Generate a full week of WODs in seconds. KOVA learns your gym's style and keeps programming consistent — week after week." },
      { icon: '📅', title: 'Class Scheduling', desc: 'Set up recurring class slots, manage capacity, and let members book directly from their phone up to 2 days in advance.' },
      { icon: '👥', title: 'Member Management', desc: "Invite members, track attendance, and manage your gym community — all in one place. Waitlists handled automatically." },
      { icon: '🎯', title: 'Auto-Scaling', desc: 'Every WOD automatically scaled to Rx, Scaled, and Beginner. No more writing three versions of the same workout.' },
      { icon: '🏋️', title: 'CrossFit & Hyrox', desc: "Built-in programming logic for both CrossFit and Hyrox gyms. Switch gym type in settings — the AI adapts instantly." },
      { icon: '✏️', title: 'Full Edit Control', desc: 'AI generates, you approve. Edit any workout before publishing — structured editor or free text, your choice.' },
    ].map(f => (
      <div key={f.title} style={{ background: '#050505', padding: '40px 32px' }}>
        <div style={{
          width: 40, height: 40, background: 'rgba(212,175,55,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, marginBottom: 20,
        }}>{f.icon}</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
        <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.7 }}>{f.desc}</p>
      </div>
    ))}
  </div>
</section>
```

- [ ] **Step 2: Build check and commit**

```bash
npm run build 2>&1 | tail -10
git add app/page.tsx
git commit -m "feat: landing page features section"
```

---

### Task 6: CTA section and Footer

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add CTA section after Features**

```tsx
{/* CTA */}
<section style={{
  textAlign: 'center', padding: '100px 64px',
  borderTop: '1px solid rgba(255,255,255,0.05)',
  position: 'relative', overflow: 'hidden',
}}>
  {/* Glow */}
  <div style={{
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: 600, height: 300, pointerEvents: 'none',
    background: 'radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 70%)',
  }} />
  <h2 className="landing-cta-headline" style={{
    fontSize: 52, fontWeight: 800, letterSpacing: -2, marginBottom: 16, position: 'relative',
  }}>
    Ready to elevate<br />
    <span style={{ color: '#D4AF37' }}>your gym?</span>
  </h2>
  <p style={{ color: '#9CA3AF', fontSize: 16, marginBottom: 40, position: 'relative' }}>
    Join gym owners already using KOVA to program smarter.
  </p>
  <Link href="/signup" style={{
    background: '#D4AF37', color: '#000', padding: '14px 36px',
    fontSize: 14, fontWeight: 700, letterSpacing: 1,
    textTransform: 'uppercase', textDecoration: 'none',
    display: 'inline-block', position: 'relative',
  }}>Get Started Free</Link>
</section>
```

- [ ] **Step 2: Add Footer after CTA**

```tsx
{/* FOOTER */}
<footer style={{
  padding: '28px 64px', borderTop: '1px solid rgba(255,255,255,0.05)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
}}>
  <KovaLogo size="sm" />
  <span style={{ fontSize: 12, color: '#444' }}>© 2026 KOVA. All rights reserved.</span>
</footer>
```

- [ ] **Step 3: Final build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no errors or warnings about the landing page.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: landing page CTA and footer — page complete"
```

- [ ] **Step 5: Push to GitHub**

```bash
git push origin main
```

---

## Visual Checklist (manual verification after build)

Start the dev server (`npm run dev`) and check:

- [ ] Nav sticks to top while scrolling
- [ ] "Features" and "How It Works" nav links scroll to correct sections smoothly
- [ ] Hero headline is 58px, "Perform Better." is gold
- [ ] App preview card shows 5 workout day columns with day labels and tags
- [ ] Stats bar shows 3 items separated by dividers
- [ ] How It Works shows 3 numbered steps with gold step numbers
- [ ] Features shows 6 cards in a 3-column grid
- [ ] CTA gold glow is visible behind the headline
- [ ] Footer logo on left, copyright on right
- [ ] Resize to mobile (< 480px): app preview hidden, hero single-column, nav links hidden
- [ ] Resize to tablet (480–768px): app preview visible below text, features 2-column
