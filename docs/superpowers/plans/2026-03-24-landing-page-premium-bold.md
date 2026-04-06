# Landing Page Premium Bold Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the KOVA landing page visual style to "Premium Bold" — gold gradient text on all headlines, glowing gradient CTAs, dual ambient hero glow, richer card styling, and deeper blacks throughout.

**Architecture:** Pure inline style changes to two files. No layout, copy, or structural changes. No new imports or components.

**Tech Stack:** Next.js 14 App Router, TypeScript, React inline styles.

---

## File Map

| Action | File | What changes |
|--------|------|--------------|
| Modify | `components/ui/kova-logo.tsx` | Diamond: gradient fill + gold glow shadow |
| Modify | `app/page.tsx` | All section Premium Bold styling (background, gradients, glows, shadows, borders) |

---

### Task 1: Upgrade KovaLogo diamond

**Files:**
- Modify: `components/ui/kova-logo.tsx`

- [ ] **Step 1: Read the file**

Read `components/ui/kova-logo.tsx`. Locate the diamond div (line ~15–23).

- [ ] **Step 2: Replace the diamond's `backgroundColor` with a gradient + glow**

Find:
```tsx
        style={{
          width: hex,
          height: hex,
          backgroundColor: '#D4AF37',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          flexShrink: 0,
        }}
```

Replace with:
```tsx
        style={{
          width: hex,
          height: hex,
          background: 'linear-gradient(135deg, #D4AF37, #F5D060)',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          flexShrink: 0,
          boxShadow: '0 0 12px rgba(212,175,55,0.5)',
        }}
```

Note: `backgroundColor` → `background` (required for gradient to work).

Note: The footer in `app/page.tsx` renders `<KovaLogo size="sm" />` (line ~324), so this single component change covers both the nav and footer diamond instances. No separate step in Task 2 is needed for the footer.

- [ ] **Step 3: Build check**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/ui/kova-logo.tsx
git commit -m "feat: premium bold — kova logo gradient diamond"
```

---

### Task 2: Premium Bold styling — `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

Read `app/page.tsx` in full before starting. Make all changes in the order listed below.

---

#### 2a — Top-level div background

- [ ] **Step 1: Deepen the page background**

Find:
```tsx
    <div style={{ background: '#050505', color: '#fff', minHeight: '100vh', fontFamily: 'var(--font-inter)' }}>
```

Replace `'#050505'` with `'#060608'`:
```tsx
    <div style={{ background: '#060608', color: '#fff', minHeight: '100vh', fontFamily: 'var(--font-inter)' }}>
```

---

#### 2b — Nav upgrades

- [ ] **Step 2: Deepen nav backdrop blur and background**

Find the nav style object. Update two values:
- `backdropFilter: 'blur(12px)'` → `backdropFilter: 'blur(20px)'`
- `background: 'rgba(5,5,5,0.9)'` → `background: 'rgba(6,6,8,0.92)'`

- [ ] **Step 3: Upgrade nav Sign In button to gradient + glow**

Find:
```tsx
          <Link href="/login" style={{
            background: '#D4AF37', color: '#000', padding: '8px 20px',
            fontSize: 12, fontWeight: 700, letterSpacing: 1, textDecoration: 'none',
          }}>Sign In</Link>
```

Replace:
```tsx
          <Link href="/login" style={{
            background: 'linear-gradient(135deg, #D4AF37, #F5D060)', color: '#000', padding: '8px 20px',
            fontSize: 12, fontWeight: 700, letterSpacing: 1, textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(212,175,55,0.35), 0 2px 8px rgba(212,175,55,0.2)',
          }}>Sign In</Link>
```

---

#### 2c — Hero section upgrades

- [ ] **Step 4: Expand primary gold glow + add indigo secondary glow**

Find the background glow div (the one with `position: 'absolute', top: 0, right: 0, width: 600, height: 600`). Update `width`, `height`, and `background` only — keep `position`, `top`, `right`, `pointerEvents` unchanged:

```tsx
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 700, height: 700,
          background: 'radial-gradient(circle at 70% 40%, rgba(212,175,55,0.1) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
```

Immediately after that div, add the indigo secondary glow:
```tsx
        {/* Secondary glow — indigo */}
        <div style={{
          position: 'absolute', bottom: -100, left: -80, width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
```

- [ ] **Step 5: Upgrade hero h1 span to gradient text**

Find:
```tsx
            <span style={{ color: '#D4AF37' }}>Perform Better.</span>
```

Replace:
```tsx
            <span style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #F5D060 50%, #D4AF37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Perform Better.</span>
```

- [ ] **Step 6: Upgrade "Create Your Gym" CTA button**

Find:
```tsx
            <Link href="/signup" style={{
              background: '#D4AF37', color: '#000', padding: '13px 28px',
              fontSize: 13, fontWeight: 700, letterSpacing: 1, textDecoration: 'none', textTransform: 'uppercase',
            }}>Create Your Gym</Link>
```

Replace:
```tsx
            <Link href="/signup" style={{
              background: 'linear-gradient(135deg, #D4AF37, #F5D060)', color: '#000', padding: '13px 28px',
              fontSize: 13, fontWeight: 700, letterSpacing: 1, textDecoration: 'none', textTransform: 'uppercase',
              boxShadow: '0 8px 32px rgba(212,175,55,0.35), 0 2px 8px rgba(212,175,55,0.2)',
            }}>Create Your Gym</Link>
```

- [ ] **Step 7: Upgrade inline hero stat values to gradient text**

Find the three stat value divs inside the inline stats section. Each currently looks like:
```tsx
                <div style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37' }}>{s.value}</div>
```

Replace with:
```tsx
                <div style={{
                  fontSize: 22, fontWeight: 800,
                  background: 'linear-gradient(135deg, #D4AF37 0%, #F5D060 50%, #D4AF37 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>{s.value}</div>
```

---

#### 2d — App preview card upgrades

- [ ] **Step 8: Upgrade app preview box shadow and background**

Find the app preview outer div (className `"landing-app-preview"`). Update:
- `background: '#0d0d0d'` → `background: '#0a0a0e'`
- `border: '1px solid #1a1a1a'` → `border: '1px solid rgba(255,255,255,0.06)'`
- Replace the `boxShadow` value:

```tsx
          boxShadow: '0 60px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.07), inset 0 1px 0 rgba(212,175,55,0.15)',
```

- [ ] **Step 9: Strengthen top gold shimmer line**

Find the top gold line div inside the app preview (has `left: '20%', right: '20%', height: 1`). Update only `background`:
```tsx
            background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.6), transparent)',
```

- [ ] **Step 10: Upgrade app bar styling**

Find the app bar div (contains "Weekly Program" span). Update:
- `background: '#0a0a0a'` → `background: '#080810'`
- `borderBottom: '1px solid #151515'` → `borderBottom: '1px solid rgba(255,255,255,0.05)'`

- [ ] **Step 11: Upgrade workout day cards**

Find each workout day card div (inside the 5-column grid, has `background: '#111'`). Update:
- `background: '#111'` → `background: 'linear-gradient(180deg, #111118 0%, #0e0e14 100%)'`
- `border: '1px solid #1a1a1a'` → `border: '1px solid rgba(255,255,255,0.05)'`

- [ ] **Step 12: Upgrade "APPROVE & PUBLISH" button in app footer**

Find the APPROVE & PUBLISH span. Update:
- `background: '#D4AF37'` → `background: 'linear-gradient(135deg, #D4AF37, #F5D060)'`
- Add: `boxShadow: '0 4px 12px rgba(212,175,55,0.25)'`

---

#### 2e — Stats bar upgrades

- [ ] **Step 13: Upgrade stats bar background**

Find the stats bar div (className `"landing-stats-bar"`). Update:
- `background: 'rgba(212,175,55,0.02)'` → `background: 'linear-gradient(180deg, rgba(212,175,55,0.025) 0%, transparent 100%)'`

- [ ] **Step 14: Upgrade stats bar divider**

Find the stats bar divider div (a thin separator between stat items, has `background: 'rgba(212,175,55,0.1)'` or similar white/gold). Update:
```tsx
background: 'rgba(255,255,255,0.05)',
```

- [ ] **Step 15: Upgrade stat values to gradient text**

Find the stat value divs (className `"landing-stats-num"`, currently `color: '#D4AF37'`):
```tsx
              <div className="landing-stats-num" style={{ fontSize: 28, fontWeight: 800, color: '#D4AF37', letterSpacing: -1 }}>{item.value}</div>
```

Replace:
```tsx
              <div className="landing-stats-num" style={{
                fontSize: 28, fontWeight: 800, letterSpacing: -1,
                background: 'linear-gradient(135deg, #D4AF37 0%, #F5D060 50%, #D4AF37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>{item.value}</div>
```

---

#### 2f — How It Works section upgrades

- [ ] **Step 16: Upgrade How It Works h2 span to gradient text**

Find:
```tsx
          <span style={{ color: '#D4AF37' }}>in three steps.</span>
```
(inside the How It Works h2)

Replace:
```tsx
          <span style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5D060 50%, #D4AF37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>in three steps.</span>
```

- [ ] **Step 17: Upgrade step card icon boxes**

Find the icon box divs inside the step cards (have `background: 'rgba(212,175,55,0.1)'`):
```tsx
              <div style={{
                width: 40, height: 40, background: 'rgba(212,175,55,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, marginBottom: 16,
              }}>{step.icon}</div>
```

Replace:
```tsx
              <div style={{
                width: 40, height: 40,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))',
                border: '1px solid rgba(212,175,55,0.15)',
                borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, marginBottom: 16,
              }}>{step.icon}</div>
```

- [ ] **Step 18: Add top hairline accent to step cards**

Each step card div currently opens as:
```tsx
            <div key={step.num} style={{ background: '#050505', padding: '40px 32px', position: 'relative' }}>
              <div style={{ fontSize: 56, ...
```

Add the hairline as the first child:
```tsx
            <div key={step.num} style={{ background: '#050505', padding: '40px 32px', position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.15), transparent)',
                pointerEvents: 'none',
              }} />
              <div style={{ fontSize: 56, ...
```

---

#### 2g — Features section upgrades

- [ ] **Step 19: Upgrade Features h2 span to gradient text**

Find:
```tsx
          <span style={{ color: '#D4AF37' }}>Nothing it doesn&apos;t.</span>
```
(inside the Features h2)

Replace:
```tsx
          <span style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5D060 50%, #D4AF37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Nothing it doesn&apos;t.</span>
```

- [ ] **Step 20: Add `position: 'relative'` to feature cards + hairline + upgraded icon box**

Feature cards currently open as:
```tsx
            <div key={f.title} style={{ background: '#050505', padding: '40px 32px' }}>
              <div style={{
                width: 40, height: 40, background: 'rgba(212,175,55,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, marginBottom: 20,
              }}>{f.icon}</div>
```

Replace with:
```tsx
            <div key={f.title} style={{ background: '#050505', padding: '40px 32px', position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.15), transparent)',
                pointerEvents: 'none',
              }} />
              <div style={{
                width: 40, height: 40,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))',
                border: '1px solid rgba(212,175,55,0.15)',
                borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, marginBottom: 20,
              }}>{f.icon}</div>
```

---

#### 2h — CTA section upgrades

- [ ] **Step 21: Upgrade CTA glow div**

Find the CTA glow div (has `width: 600, height: 300`). Update:
```tsx
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 700, height: 400, pointerEvents: 'none',
          background: 'radial-gradient(ellipse, rgba(212,175,55,0.08) 0%, transparent 65%)',
        }} />
```

- [ ] **Step 22: Upgrade CTA h2 span to gradient text + increase size**

Find the CTA h2 (currently `fontSize: 52`). Update `fontSize` to `56` and replace the span:

```tsx
        <h2 className="landing-cta-headline" style={{
          fontSize: 56, fontWeight: 800, letterSpacing: -2, marginBottom: 16, position: 'relative',
        }}>
          Ready to elevate<br />
          <span style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5D060 50%, #D4AF37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>your gym?</span>
        </h2>
```

- [ ] **Step 23: Upgrade CTA "Get Started Free" button**

Find:
```tsx
        <Link href="/signup" style={{
          background: '#D4AF37', color: '#000', padding: '14px 36px',
          fontSize: 14, fontWeight: 700, letterSpacing: 1,
          textTransform: 'uppercase', textDecoration: 'none',
          display: 'inline-block', position: 'relative',
        }}>Get Started Free</Link>
```

Replace:
```tsx
        <Link href="/signup" style={{
          background: 'linear-gradient(135deg, #D4AF37, #F5D060)', color: '#000', padding: '16px 44px',
          fontSize: 14, fontWeight: 700, letterSpacing: 1,
          textTransform: 'uppercase', textDecoration: 'none',
          display: 'inline-block', position: 'relative',
          boxShadow: '0 12px 40px rgba(212,175,55,0.4), 0 4px 12px rgba(212,175,55,0.2)',
        }}>Get Started Free</Link>
```

---

#### 2i — Build check and commit

- [ ] **Step 24: Build check**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npm run build 2>&1 | tail -15
```

Expected: Build succeeds. No TypeScript errors.

If the build fails, check for:
- `WebkitBackgroundClip` / `WebkitTextFillColor` — these must be camelCase, not kebab-case strings
- Any unclosed JSX tags introduced by the edits

- [ ] **Step 25: Commit**

```bash
git add app/page.tsx
git commit -m "feat: premium bold — landing page gradient text, glowing CTAs, richer shadows"
```

---

## Visual Checklist (manual, after build)

Run `npm run dev` and open `http://localhost:3000` in an incognito window:

- [ ] "Perform Better." headline text is a gold gradient (not flat gold)
- [ ] "Create Your Gym" and "Get Started Free" buttons glow when you look closely
- [ ] Hero has a subtle indigo tint in the bottom-left
- [ ] Stats bar values (< 30s, CrossFit + Hyrox, Rx / Scaled / Beginner) are gradient gold
- [ ] Section headings gold spans all use gradient text
- [ ] How It Works and Features cards have a hairline gold accent at the top
- [ ] Feature cards' icon boxes have a subtle border
- [ ] KovaLogo diamond is gradient (visible in nav and footer)
- [ ] "APPROVE & PUBLISH" button in app preview has a gradient fill
