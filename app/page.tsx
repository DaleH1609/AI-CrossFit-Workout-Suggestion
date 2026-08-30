import Link from 'next/link'
import { KovaLogo } from '@/components/ui/kova-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { WodCardsHero } from '@/components/landing/wod-cards-hero'
import { WodWalkthrough } from '@/components/landing/wod-walkthrough'
import { PhraseSpinner } from '@/components/landing/phrase-spinner'
import { FadeIn } from '@/components/ui/fade-in'
import { CleanAndJerk } from '@/components/landing/clean-and-jerk'
import { BarbellRule } from '@/components/landing/barbell-rule'
import { RevealText } from '@/components/ui/reveal-text'
import { SplitHeading } from '@/components/ui/split-heading'
import { Magnetic } from '@/components/ui/magnetic'
import { CountUp } from '@/components/ui/count-up'
import { MovementMarquee } from '@/components/landing/movement-marquee'
// SSR entry — this page is a server component, so the CSR build would force a
// client boundary for what are static glyphs.
import {
  Sparkle,
  CalendarBlank,
  Users,
  StackSimple,
  Barbell,
  PencilLine,
  Check,
  Lightning,
} from '@phosphor-icons/react/dist/ssr'

const FEATURES = [
  { icon: Sparkle,       title: 'AI Workout Generation', desc: "Generate a full week of WODs in seconds. KOVA learns your gym's style and keeps programming consistent." },
  { icon: CalendarBlank, title: 'Class Scheduling',      desc: 'Set up recurring class slots, manage capacity, and let members book directly from their phone.' },
  { icon: Users,         title: 'Member Management',     desc: "Invite members, track attendance, and manage your gym community - all in one place." },
  { icon: StackSimple,   title: 'Auto-Scaling',          desc: 'Every WOD automatically scaled to Rx, Scaled, and Beginner. No more writing three versions.' },
  { icon: Barbell,       title: 'CrossFit & Hyrox',      desc: "Built-in programming logic for both gym types. Switch in settings - the AI adapts instantly." },
  { icon: PencilLine,    title: 'Full Edit Control',     desc: 'AI generates, you approve. Edit any workout before publishing - structured editor or free text.' },
]

const MEMBER_BENEFITS = [
  { label: 'Book classes in seconds',  desc: 'Live capacity, one-tap booking, instant confirmation.' },
  { label: "See today's WOD",          desc: 'Know the workout - and their scaling - before they arrive.' },
  { label: 'No app download needed',   desc: 'Works from any browser on any device.' },
]

const MOCK_CLASSES = [
  { time: '6:00 AM', booked: 11, cap: 16, full: false },
  { time: '9:00 AM', booked: 16, cap: 16, full: true  },
  { time: '5:30 PM', booked: 7,  cap: 16, full: false },
]

// Split into prefix/value/suffix so CountUp can animate the numeral while the
// surrounding characters stay fixed.
const STATS = [
  { prefix: '<',  value: 30,  suffix: 's', label: 'To generate a full week of WODs - start to publishable draft.' },
  { prefix: '',   value: 3,   suffix: '×', label: 'Scaling versions written for every workout, automatically. Rx, Scaled, Beginner.' },
  { prefix: '',   value: 100, suffix: '%', label: 'Edit control. Nothing reaches your members until you approve it.' },
]

const AI_PREVIEW_WODS = [
  { day: 'Mon', name: 'Back Squat 5×5 + AMRAP 15',    tag: 'Strength'  },
  { day: 'Tue', name: '21-15-9 Thrusters / Pull-ups', tag: 'Metcon'    },
  { day: 'Wed', name: 'EMOM 20 - Gymnastics Focus',   tag: 'Skill'     },
  { day: 'Thu', name: 'Clean & Jerk 1RM + RFT',       tag: 'Olympic'   },
  { day: 'Fri', name: 'Hero WOD - Murph Prep',        tag: 'Endurance' },
]

export default function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-screen font-body">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      {/* Change 1: added primary "Get Started" CTA alongside Sign In */}
      <nav
        className="sticky top-0 z-50 h-16 backdrop-blur-md border-b border-border"
        style={{ background: 'color-mix(in srgb, var(--color-background) 90%, transparent)' }}
      >
        {/* Padding matches the hero's full-bleed gutter, not a centred container -
            a max-w nav over a full-bleed hero is the seam that reads as templated. */}
        <div className="w-full px-6 sm:px-10 lg:px-16 h-full flex items-center justify-between">
          <KovaLogo size="lg" />
          <div className="flex items-center gap-6">
            <a href="#features"     className="hidden md:block font-mono text-[11px] tracking-[0.2em] uppercase text-secondary hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hidden md:block font-mono text-[11px] tracking-[0.2em] uppercase text-secondary hover:text-foreground transition-colors">How It Works</a>
            <ThemeToggle />
            <Link href="/login"  className="hidden sm:block font-mono text-[11px] tracking-[0.2em] uppercase text-secondary hover:text-foreground transition-colors">Sign In</Link>
            <Link
              href="/signup"
              className="bg-accent text-on-accent px-5 py-2 text-xs font-bold tracking-widest uppercase touch-manipulation rounded-full hover:bg-accent-90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      {/* Change 2+3+4+8: full-width dot grid bg, larger H1, pain statement */}
      <div className="relative">
        <section className="relative min-h-[92vh] w-full px-6 sm:px-10 lg:px-16 pt-20 pb-24 grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-y-16 gap-x-12 items-center">
          <div className="max-w-[46rem]">
            <p
              className="hero-fade-up font-mono text-[11px] font-medium tracking-[0.3em] text-accent uppercase mb-8"
              style={{ animationDelay: '0.05s' }}
            >
              AI-Powered Gym Programming
            </p>

            {/* Display lockup: uppercase, near-zero leading, edge-to-edge.
                The whole hero hangs off this one gesture. */}
            <SplitHeading
              as="h1"
              immediate
              delay={0.15}
              className="font-display uppercase text-foreground mb-10
                         text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.88] tracking-[-0.02em]"
            >
              <>Program your gym in <span className="text-accent">seconds.</span></>
            </SplitHeading>

            <p
              className="hero-fade-up text-base text-secondary leading-relaxed max-w-md mb-10"
              style={{ animationDelay: '0.25s' }}
            >
              Most coaches spend hours a week writing workouts. KOVA writes your full week in under 30 seconds.
            </p>

            <div
              className="hero-fade-up flex items-center gap-5 mb-7"
              style={{ animationDelay: '0.35s' }}
            >
              <Magnetic>
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center touch-manipulation bg-accent text-on-accent px-8 text-sm font-bold tracking-widest uppercase rounded-full hover:bg-accent-90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Create Your Gym
                </Link>
              </Magnetic>
              <Link href="/login" className="text-sm text-secondary border-b border-secondary/40 pb-px hover:text-foreground transition-colors">
                Sign in →
              </Link>
            </div>
          </div>

          <div className="hero-fade-up" style={{ animationDelay: '0.2s' }}>
            <WodCardsHero />
          </div>
        </section>
      </div>

      {/* ── PHRASE SPINNER ───────────────────────────────────────────── */}
      <PhraseSpinner />

      <MovementMarquee />

      {/* ── STATS ───────────────────────────────────────────────────── */}
      {/* Not a strip of three equal boxes. Each figure is a full-width row
          with the number at display scale and the label hung beside it, so the
          eye reads down a column of numerals rather than across a card set.
          Numbers count up on entry - a static figure reads as decoration, a
          counting one reads as a measurement. */}
      <div className="bg-[#0B0B0C] pt-24 pb-20">
        <div className="w-full px-6 sm:px-10 lg:px-16">

          <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {STATS.map((s, i) => (
              <FadeIn key={s.label} delay={i * 90}>
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-12 gap-y-3 items-baseline py-9 group">
                  <div className="flex items-baseline gap-4">
                    <span className="font-display text-white leading-[0.85] tracking-tight text-[clamp(2.5rem,6vw,4.5rem)] transition-colors duration-300 group-hover:text-accent">
                      {s.prefix}
                      <CountUp to={s.value} suffix={s.suffix} />
                    </span>
                  </div>
                  <p className="text-white/45 leading-relaxed max-w-sm md:justify-self-end md:text-right text-pretty">
                    {s.label}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>

      {/* ── THE LIFT ────────────────────────────────────────────────── */}
      {/* Continues the dark band opened by the stats strip: stats → rule →
          scroll-driven lift → rule, then back out to light for the product. */}
      <BarbellRule label="Clean & Jerk" />
      <CleanAndJerk />
      <BarbellRule />

      {/* ── WOD WALKTHROUGH ─────────────────────────────────────────── */}
      <WodWalkthrough />

      {/* ── MEMBER SECTION ──────────────────────────────────────────── */}
      {/* Change 6: larger, app-chrome mock that feels immersive */}
      <section className="bg-surface border-y border-border py-24">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Larger app-frame mock */}
          <FadeIn>
            <div className="bg-background rounded-card border border-border overflow-hidden shadow-md">

              {/* App header bar */}
              <div className="bg-surface border-b border-border px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-accent uppercase">KOVA Member</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">This Week</p>
                </div>
                <span className="text-xs font-semibold text-accent bg-accent-10 border border-accent/20 px-2.5 py-1 rounded-btn">
                  1 class booked ✓
                </span>
              </div>

              {/* Day tabs */}
              <div className="flex border-b border-border">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                  <button
                    key={day}
                    className={`flex-1 py-3 text-xs font-semibold transition-colors ${
                      i === 0
                        ? 'text-accent border-b-2 border-accent bg-accent-5'
                        : 'text-secondary'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Class slots */}
              <div className="p-4 space-y-2">
                <p className="text-[10px] font-bold tracking-widest text-secondary/60 uppercase mb-3">
                  Classes · Monday 14 Apr
                </p>
                {MOCK_CLASSES.map(cls => {
                  const pct = Math.round((cls.booked / cls.cap) * 100)
                  return (
                    <div key={cls.time} className="flex items-center gap-3 bg-surface border border-border rounded-btn px-3 py-3">
                      <span className="text-xs font-bold text-foreground w-14 flex-shrink-0">{cls.time}</span>
                      <div className="flex-1">
                        <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: cls.full ? 'var(--color-secondary)' : 'var(--color-accent)',
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-secondary w-10 text-right flex-shrink-0">{cls.booked}/{cls.cap}</span>
                      {cls.full ? (
                        <span className="text-[10px] font-semibold text-secondary w-12 text-right flex-shrink-0">Full</span>
                      ) : (
                        <button className="text-[10px] font-bold tracking-widest uppercase text-accent w-12 text-right flex-shrink-0">Book</button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* WOD preview */}
              <div className="mx-4 mb-4 bg-surface border border-border rounded-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold tracking-widest text-accent uppercase">Monday&apos;s WOD</p>
                  <span className="text-[10px] text-secondary">Strength · 45 min</span>
                </div>
                <p className="text-base font-bold text-foreground mb-0.5">Back Squat 5×5</p>
                <p className="text-xs text-secondary mb-3">@ 80% 1RM - 3 min rest between sets</p>
                <div className="border-t border-border pt-3 mb-3">
                  <p className="text-[10px] font-bold tracking-widest text-accent uppercase mb-1.5">AMRAP 15 min</p>
                  <p className="text-xs text-secondary">10 Pull-ups, 15 Box Jumps, 20 KB Swings</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 text-[10px] font-bold rounded-btn bg-accent-10 text-accent border border-accent/20">Rx</span>
                  <span className="px-2.5 py-1 text-[10px] font-semibold rounded-btn bg-surface-raised border border-border text-secondary">Scaled</span>
                  <span className="px-2.5 py-1 text-[10px] font-semibold rounded-btn bg-surface-raised border border-border text-secondary">Beginner</span>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Copy */}
          <FadeIn delay={100}>
            <div className="lg:pt-4">
              <RevealText
                lines={['Book a class.', <span key="a" className="text-accent">Show up ready.</span>]}
                className="font-display uppercase text-foreground leading-[0.85] tracking-[-0.02em] text-[clamp(2.5rem,6vw,4.75rem)] mb-7"
              />
              <p className="text-base text-secondary leading-relaxed mb-8">
                Members get their own view - browse the week&apos;s WODs, reserve a spot, and check their scaling before they arrive. No app download required.
              </p>
              <ul className="space-y-5">
                {MEMBER_BENEFITS.map(b => (
                  <li key={b.label} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-accent-10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                      <Check size={11} weight="bold" className="text-accent" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{b.label}</p>
                      <p className="text-sm text-secondary mt-0.5">{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-16">

        {/* Section header - hangs off the same left gutter as the hero rather
            than re-centring, so the page has one spine instead of two. */}
        <div className="w-full px-6 sm:px-10 lg:px-16 pt-28 pb-16">
          <div>
            <p className="font-mono text-[11px] tracking-[0.3em] text-accent uppercase mb-6">What KOVA does</p>
            <RevealText
              lines={['Everything your', 'gym needs.', <span key="a" className="text-accent">Nothing it doesn&apos;t.</span>]}
              className="font-display uppercase text-foreground leading-[0.85] tracking-[-0.02em] text-[clamp(2.25rem,5vw,4rem)]"
            />
          </div>
          <p className="mt-6 max-w-[65ch] text-base text-secondary leading-relaxed">
            Six systems, one place. No plugin marketplace, no per-seat add-ons, no
            half-finished modules you have to work around.
          </p>
        </div>

        {/* Change 5: AI Generation hero feature - full-width callout above the grid */}
        <FadeIn>
          <div className="bg-surface border-y border-border">
            <div className="w-full px-6 sm:px-10 lg:px-16 py-20 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-14 lg:gap-20 items-center">

              {/* Copy */}
              <div>
                <div className="flex items-center gap-2.5 mb-6">
                  <Lightning size={13} weight="fill" className="text-accent" />
                </div>
                <RevealText
                  as="h3"
                  lines={['Your whole week,', <span key="a" className="text-accent">written by AI.</span>]}
                  className="font-display uppercase text-foreground leading-[0.85] tracking-[-0.02em] text-[clamp(2.25rem,5vw,4rem)] mb-6"
                />
                <p className="text-base text-secondary leading-relaxed mb-8 max-w-md text-pretty">
                  Tell KOVA your gym&apos;s training style once. It generates balanced, intelligent programming - strength cycles, metcons, skill work, and Olympic lifting - that genuinely matches how you coach.
                </p>
                <div className="flex gap-2 flex-wrap">
                  {['CrossFit', 'Hyrox', 'Strength Focus', 'Skill Bias'].map(tag => (
                    <span key={tag} className="px-4 py-2 font-mono text-[10px] tracking-[0.15em] uppercase rounded-full bg-accent-10 border border-accent/25 text-accent">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Live generation preview */}
              <div className="bg-background border border-border rounded-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold tracking-widest text-accent uppercase">Week of 14 Apr</span>
                  <span className="flex items-center gap-1.5 text-xs text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse flex-shrink-0" />
                    Generating…
                  </span>
                </div>
                <div className="space-y-1.5">
                  {AI_PREVIEW_WODS.map((row, i) => (
                    <div
                      key={row.day}
                      className="wod-row-in flex items-center gap-3 px-3 py-2 bg-surface border border-border rounded-btn"
                      style={{ animationDelay: `${i * 0.2}s`, opacity: 0 }}
                    >
                      <span className="text-xs font-bold text-accent w-7 flex-shrink-0">{row.day}</span>
                      <span className="text-xs text-foreground flex-1">{row.name}</span>
                      <span className="text-[10px] text-secondary bg-background border border-border px-2 py-0.5 rounded flex-shrink-0">
                        {row.tag}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center gap-1.5">
                  <span className="ai-cursor" />
                  <span className="text-xs text-secondary">AI generating your week</span>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Feature grid. Deliberately not a uniform 3-up: the first cell spans
            two columns and carries a numbered index, so the eye enters at a
            fixed point instead of scanning six identical tiles. */}
        <div className="w-full px-6 sm:px-10 lg:px-16 pb-28">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
            {FEATURES.map((f, i) => (
              <FadeIn
                key={f.title}
                delay={i * 60}
                className={i === 0 ? 'sm:col-span-2' : undefined}
              >
                <div className="h-full bg-surface p-9 lg:p-11 hover:bg-surface-raised transition-colors group relative">
                  <f.icon size={i === 0 ? 34 : 26} weight="duotone" className="mb-6 text-accent" />
                  <h3
                    className={`font-display uppercase tracking-tight text-pretty text-foreground mb-3 group-hover:text-accent transition-colors ${
                      i === 0 ? 'text-3xl lg:text-4xl' : 'text-2xl'
                    }`}
                  >
                    {f.title}
                  </h3>
                  <p className={`text-sm text-secondary leading-relaxed ${i === 0 ? 'max-w-md' : ''}`}>{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-[#0B0B0C] py-24 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(198,242,78,0.08) 0%, transparent 65%)' }}
        />
        <div className="relative px-6">
          {/* Closing lockup, scaled to match the hero so the page opens and shuts
              on the same typographic note. */}
          <RevealText
            lines={['Ready to elevate', <span key="a" className="text-accent">your gym?</span>]}
            className="font-display uppercase text-white leading-[0.82] tracking-[-0.02em] text-[clamp(2.5rem,6vw,4.5rem)] mb-8"
          />
          <p className="text-white/40 text-base mb-10">Start programming smarter today.</p>
          <Magnetic strength={0.35}>
            <Link
              href="/signup"
              className="inline-flex h-14 items-center touch-manipulation bg-accent text-black px-11 text-sm font-bold tracking-widest uppercase rounded-full hover:bg-accent-90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0C]"
            >
              Get Started Free
            </Link>
          </Magnetic>
          <p className="mt-5 font-mono text-[11px] tracking-[0.2em] uppercase text-white/25">No credit card required</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="bg-[#0B0B0C] border-t border-white/[0.07]">
        {/* Shares the page's full-bleed gutter rather than re-centring, and
            closes on the wordmark at display scale so the page ends on the
            same typographic note it opened with. */}
        <div className="w-full px-6 sm:px-10 lg:px-16 pt-20 pb-10">
          <p className="font-display uppercase leading-[0.8] tracking-tight text-white/[0.06] text-[clamp(4rem,18vw,14rem)] select-none pointer-events-none mb-16">
            KOVA
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
            <div className="col-span-2">
              <KovaLogo size="sm" />
              <p className="text-sm text-white/40 mt-5 max-w-xs leading-relaxed text-pretty">
                AI-powered gym programming for CrossFit and Hyrox coaches. Less planning, more coaching.
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/25 mb-6">Product</p>
              <ul className="space-y-3">
                {[['Features', '#features'], ['How It Works', '#how-it-works']].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="font-mono text-[11px] tracking-[0.15em] uppercase text-white/45 hover:text-accent transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/25 mb-6">Account</p>
              <ul className="space-y-3">
                {[['Sign In', '/login'], ['Create Gym', '/signup']].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="font-mono text-[11px] tracking-[0.15em] uppercase text-white/45 hover:text-accent transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex items-center justify-between">
            <span className="text-xs text-white/20">© 2026 KOVA. All rights reserved.</span>
            <span className="text-xs text-white/20">Built for coaches.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
