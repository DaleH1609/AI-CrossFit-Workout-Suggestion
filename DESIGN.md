# Design System: KOVA

Single source of truth for KOVA's visual language. Every value here was read
back from the codebase, not invented. Generated using the `stitch-design-taste`
skill; the format follows the `DESIGN.md` convention, so design agents read this
the way coding agents read `AGENTS.md`.

**Dials:** Variance 7 · Motion 6 · Density 5
Landing leans marketing (variance 7, motion 6, density 3). The authenticated app
is a working tool used daily by coaches mid-session, so it runs denser and
calmer (variance 5, motion 4, density 6). Motion earns its place in the app only
where it communicates state.

---

## 1. Visual Theme & Atmosphere

Athletic, editorial, weighted. A near-black ground with a single gold accent and
condensed uppercase display type. The reference points are Nike's marketing
system (extreme typographic contrast, kinetic, absolute) and BMW M's technical
labelling, filtered through the reality that this is gym software used at 6am on
a phone, not a campaign microsite.

Restraint is the operating principle: one accent, one type system, generous
space, and motion that carries weight rather than decorates.

## 2. Color Palette & Roles

Two themes. One accent in both. Never pure `#000000`.

### Light
- **Bone** (`#FAFAF8`) — page canvas
- **Pure Surface** (`#FFFFFF`) — card and container fill
- **Raised Surface** (`#F3F3F0`) — secondary fill, hover ground
- **Ink** (`#0A0A0A`) — primary text
- **Slate Grey** (`#595F6B`) — secondary text, metadata
- **Hairline** (`#E5E5E0`) — 1px structural borders
- **KOVA Gold** (`#B8952A`) — the single accent: CTAs, active states, focus rings

### Dark
- **Near-Black** (`#070708`) — page canvas
- **Surface** (`#0E0E11`) — card fill
- **Raised Surface** (`#16161A`) — secondary fill
- **White** (`#FFFFFF`) — primary text
- **Cool Grey** (`#9CA3AF`) — secondary text
- **Hairline** (`rgba(255,255,255,0.11)`) — at 0.08 it disappeared; 0.11 registers
- **KOVA Gold** (`#D4AF37`) — accent, lifted for dark-ground contrast

### Semantic
`#DC2626`/`#EF4444` danger · `#059669`/`#34D399` success · `#B45309`/`#FBBF24`
warning. Each checked for AA contrast against its own theme's canvas.

**Constraints:** exactly one accent, used identically everywhere. Gold measures
63% (light) and 65% (dark) saturation, inside the 80% ceiling. No purple, no
neon, no gradient glows.

## 3. Typography Rules

- **Display:** Bebas Neue — condensed uppercase. Used at `clamp()` scales, never
  above ~5.5rem. Hierarchy comes from weight, colour and space, not raw size.
- **Body:** DM Sans — relaxed leading, `max-w-[65ch]`.
- **Mono:** JetBrains Mono — technical labels, counters, timestamps, tabular
  figures. Pinned rather than left to `ui-monospace`, which resolves differently
  per platform and made letterspacing inconsistent.
- **Numbers:** `tabular-nums` anywhere a value changes or aligns in a column.
- **Wrapping:** `text-wrap: balance` on h1–h4, `pretty` on body, set once in the
  base layer.

**Banned:** Inter. Any serif — this is software UI, not a publication.

## 4. Component Stylings

- **Buttons** — `md` reproduces the original box exactly (150+ call sites,
  including the dense schedule grid, so the default cannot grow). `lg` is the
  48px control used on marketing. `pill` shape opt-in. Press feedback is
  `active:scale-[0.97]`. Explicit transition property lists, never
  `transition-all`. `focus-visible` rings, never `focus`.
- **Cards** — double-bezel: an inset outer shell holding an inner core, with
  concentric radii (inner = outer minus the 6px shell padding). Depth comes from
  a bright inset hairline on the top edge, not a drop shadow: on near-black
  ground a black shadow is invisible, whereas a highlight catching the top edge
  is how a raised surface actually reads.
- **Inputs** — label above, error below, recessed not raised. Explicitly
  excluded from card elevation.
- **Loading** — panels that state what is happening, and skeletons matching the
  final layout's shape. Never a bare circular spinner.
- **Empty** — composed. The workout grid renders seven ghosted day columns at
  varying heights, so the screen shows the shape of what will appear rather than
  reading as broken.
- **Error** — inline, `role="alert"`, plain language. Never `window.alert()`.

## 5. Layout Principles

- Full-bleed gutter `px-6 / sm:px-10 / lg:px-16`. Nav shares the hero's gutter;
  a `max-w` nav over a full-bleed hero is the seam that reads as templated.
- CSS Grid over flexbox percentage maths.
- `min-h-[100dvh]`, never `h-screen` — the latter causes the iOS Safari
  address-bar jump, worst of all on pinned sections.
- Feature grids are never three equal columns; the first cell spans two.
- Section headers stack (headline, then body at 65ch). The "big headline left,
  small explainer floating right" split-header is banned.
- Maximum one eyebrow per three sections. The hero counts as one.

## 6. Motion & Interaction

Three curves, defined once and exposed as Tailwind utilities:

| Token | Curve | Use |
|---|---|---|
| `ease-fluid` | `cubic-bezier(0.32, 0.72, 0, 1)` | panels, layout shifts |
| `ease-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | hovers, entrances |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | presses, toggles |

`linear` and `ease-in-out` are banned — symmetric deceleration reads as a
browser default because it is one.

- Scroll entry: rise `3rem` with a `blur(6px)` resolving over 800ms.
- GSAP for choreography: `SplitText` headlines, `DrawSVG` line-on, `ScrollTrigger`
  for the pinned clean-and-jerk sequence.
- Continuous input (cursor, scroll progress) is driven through refs and
  `gsap.quickTo`, never `useState` — a setState per frame re-renders the tree.
- Animate `transform`, `opacity` and `filter` only.
- `prefers-reduced-motion` honoured in every animated component.
- Every `useEffect` animation has a cleanup that kills its tweens and triggers.

## 7. Anti-Patterns (Banned)

- Em-dashes and en-dashes in any user-visible string. Hyphen only.
- Section-number eyebrows (`01 / 09`, `001 · Capabilities`).
- Scroll cues (`Scroll`, bouncing chevrons).
- Emoji in UI chrome. Use Phosphor glyphs, which also carry `aria-label`s.
- Hand-rolled SVG icons. One family: Phosphor.
- `lucide-react`.
- Pure `#000000`.
- Oversized display type doing the work that weight and colour should do.
- Three equal feature cards.
- Decorative status dots. A dot is allowed only for genuine live state.
- Middle-dot as a general separator; one per line maximum.
- `border-t` and `border-b` on every row of a long list.
- Generic names, fake round numbers, and the "Elevate / Seamless / Unleash"
  copy register.
- `window.addEventListener('scroll')`.

---

## Known Deviations

Recorded honestly rather than quietly ignored.

1. **Theme lock.** Four landing sections hardcode `#08080A`. In dark mode that
   is the same tonal family and reads correctly. In light mode the page
   alternates cream and near-black, which is the "walked into a different
   website mid-scroll" failure. Fix is either committing the landing to dark
   permanently or making those bands theme-aware tints. Needs a decision.

2. **Fake product UI.** `WodCardsHero`, `MOCK_CLASSES` and `AI_PREVIEW_WODS`
   build product screenshots out of styled divs. This is named as the single
   biggest LLM-design tell. The fix is real screenshots, which are now
   obtainable using the owner and member test accounts.

3. **Touch targets.** `h-8` controls and 37 `py-1`/`py-1.5` tap targets sit
   under the 44px mobile guideline. Deliberate: the schedule grid and data
   tables are desktop-dense, and WCAG 2.5.8 AA is 24px. Worth revisiting for
   mobile-specific views only.

4. **ScrollSmoother.** Built at `components/ui/smooth-scroll.tsx` but not
   mounted. Its wrapper is transformed, which breaks `position: sticky`, and the
   landing page has three sticky elements. Enabling it requires converting
   `phrase-spinner` and `wod-walkthrough` to GSAP pins first.
