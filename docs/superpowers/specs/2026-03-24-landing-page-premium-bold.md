# Landing Page — Premium Bold Upgrade Design Spec

## Goal

Elevate the visual quality of `app/page.tsx` with the "Premium Bold" treatment: gold gradient text on all headlines, glowing gradient CTAs, dual ambient glow in the hero, deeper blacks, richer card styling, and stronger shadows throughout. No structural or copy changes — styling only.

---

## File Scope

**Files modified:**
- `app/page.tsx` — all section styling
- `components/ui/kova-logo.tsx` — diamond gradient + glow only

All changes are inline style updates. The `<style>` tag media queries in `app/page.tsx` stay unchanged. No new imports, no new components.

---

## Design Token Changes

| Token | Current | New |
|-------|---------|-----|
| Page background | `#050505` | `#060608` |
| Nav backdrop blur | `blur(12px)` | `blur(20px)` |
| Nav background | `rgba(5,5,5,0.9)` | `rgba(6,6,8,0.92)` |
| App preview background | `#0d0d0d` | `#0a0a0e` |
| App preview card bg | `#111` | `linear-gradient(180deg, #111118 0%, #0e0e14 100%)` |
| Stats bar background | `rgba(212,175,55,0.02)` | `linear-gradient(180deg, rgba(212,175,55,0.025) 0%, transparent 100%)` |

---

## Gold Gradient Technique

Applied to text via inline style on `<span>` wrappers:

```tsx
style={{
  background: 'linear-gradient(135deg, #D4AF37 0%, #F5D060 50%, #D4AF37 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}}
```

**Applied to:**
- Hero `<h1>` span: "Perform Better."
- Hero inline stat values (500+, 10K+, 50K+)
- Stats bar stat values (< 30s, CrossFit + Hyrox, Rx / Scaled / Beginner)
- How It Works `<h2>` span: "in three steps."
- Features `<h2>` span: "Nothing it doesn't."
- CTA `<h2>` span: "your gym?"

---

## Button Upgrades

### Primary CTA (nav Sign In, hero Create Your Gym, CTA Get Started Free)

Replace flat `background: '#D4AF37'` with:

```tsx
background: 'linear-gradient(135deg, #D4AF37, #F5D060)',
boxShadow: '0 8px 32px rgba(212,175,55,0.35), 0 2px 8px rgba(212,175,55,0.2)',
```

### CTA section button specifically

Larger glow:
```tsx
boxShadow: '0 12px 40px rgba(212,175,55,0.4), 0 4px 12px rgba(212,175,55,0.2)',
padding: '16px 44px',
```

---

## Nav Logo Diamond

Add glow to the diamond shape:

```tsx
background: 'linear-gradient(135deg, #D4AF37, #F5D060)',
boxShadow: '0 0 12px rgba(212,175,55,0.5)',
```

---

## Hero Section

### Dual ambient glow

Keep existing gold glow. Add a second indigo glow as a sibling div immediately after it:

```tsx
{/* Secondary glow — indigo bottom-left */}
<div style={{
  position: 'absolute', bottom: -100, left: -80,
  width: 500, height: 500, pointerEvents: 'none',
  background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 60%)',
}} />
```

Primary gold glow update — update only `width`, `height`, and `background` on the existing glow div. Keep `position: 'absolute'`, `top: 0`, `right: 0`, `pointerEvents: 'none'` unchanged:
```tsx
width: 700, height: 700,
background: 'radial-gradient(circle at 70% 40%, rgba(212,175,55,0.1) 0%, transparent 60%)',
```

---

## App Preview Card

### Box shadow upgrade

```tsx
boxShadow: '0 60px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.07), inset 0 1px 0 rgba(212,175,55,0.15)',
```

### Top gold shimmer line

Replace the absolute-positioned div approach with a stronger gradient:

```tsx
background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.6), transparent)',
```

### Workout day cards

```tsx
background: 'linear-gradient(180deg, #111118 0%, #0e0e14 100%)',
border: '1px solid rgba(255,255,255,0.05)',
```

### App bar background

```tsx
background: '#080810',
borderBottom: '1px solid rgba(255,255,255,0.05)',
```

### Publish button

```tsx
background: 'linear-gradient(135deg, #D4AF37, #F5D060)',
boxShadow: '0 4px 12px rgba(212,175,55,0.25)',
```

---

## Stats Bar

### Background upgrade

```tsx
background: 'linear-gradient(180deg, rgba(212,175,55,0.025) 0%, transparent 100%)',
```

### Divider

```tsx
background: 'rgba(255,255,255,0.05)',
```

---

## How It Works & Features — Grid Cards

### Top accent hairline on each card

Add as first child of each card div:

```tsx
<div style={{
  position: 'absolute', top: 0, left: 0, right: 0, height: 1,
  background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.15), transparent)',
  pointerEvents: 'none',
}} />
```

**How It Works cards** already have `position: 'relative'` — no change needed.

**Features cards** do NOT have `position: 'relative'`. Add it to the card's style:
```tsx
// Before:
<div key={f.title} style={{ background: '#050505', padding: '40px 32px' }}>
// After:
<div key={f.title} style={{ background: '#050505', padding: '40px 32px', position: 'relative' }}>
```

### Icon box upgrade

```tsx
background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))',
border: '1px solid rgba(212,175,55,0.15)',
borderRadius: 2,
```

---

## CTA Section

### Glow upgrade

```tsx
width: 700, height: 400,
background: 'radial-gradient(ellipse, rgba(212,175,55,0.08) 0%, transparent 65%)',
```

### Heading size

Increase to `fontSize: 56` (from 52).

---

## Footer Logo Diamond

```tsx
background: 'linear-gradient(135deg, #D4AF37, #F5D060)',
```

---

## What Does NOT Change

- Page structure and layout
- All copy/text content
- Responsive media queries in `<style>` tag
- Section `id` attributes
- Component imports
- `className` assignments
- Any other file in the project
