import Link from 'next/link'
import { KovaLogo } from '@/components/ui/kova-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { WodCardsHero } from '@/components/landing/wod-cards-hero'
import { WodWalkthrough } from '@/components/landing/wod-walkthrough'
import { PhraseSpinner } from '@/components/landing/phrase-spinner'
import { FadeIn } from '@/components/ui/fade-in'
import {
  Sparkles,
  CalendarDays,
  Users,
  Layers,
  Dumbbell,
  PenLine,
  Check,
  Zap,
} from 'lucide-react'

const FEATURES = [
  { icon: Sparkles,    title: 'AI Workout Generation', desc: "Generate a full week of WODs in seconds. KOVA learns your gym's style and keeps programming consistent." },
  { icon: CalendarDays,title: 'Class Scheduling',      desc: 'Set up recurring class slots, manage capacity, and let members book directly from their phone.' },
  { icon: Users,       title: 'Member Management',     desc: "Invite members, track attendance, and manage your gym community — all in one place." },
  { icon: Layers,      title: 'Auto-Scaling',          desc: 'Every WOD automatically scaled to Rx, Scaled, and Beginner. No more writing three versions.' },
  { icon: Dumbbell,    title: 'CrossFit & Hyrox',      desc: "Built-in programming logic for both gym types. Switch in settings — the AI adapts instantly." },
  { icon: PenLine,     title: 'Full Edit Control',     desc: 'AI generates, you approve. Edit any workout before publishing — structured editor or free text.' },
]

const MEMBER_BENEFITS = [
  { label: 'Book classes in seconds',  desc: 'Live capacity, one-tap booking, instant confirmation.' },
  { label: "See today's WOD",          desc: 'Know the workout — and their scaling — before they arrive.' },
  { label: 'No app download needed',   desc: 'Works from any browser on any device.' },
]

const MOCK_CLASSES = [
  { time: '6:00 AM', booked: 11, cap: 16, full: false },
  { time: '9:00 AM', booked: 16, cap: 16, full: true  },
  { time: '5:30 PM', booked: 7,  cap: 16, full: false },
]

const STATS = [
  { num: '< 30s', label: 'To generate a full week of WODs' },
  { num: '3×',    label: 'Scaling versions per workout, automatically' },
  { num: '100%',  label: 'Edit control before anything goes live' },
]

const AI_PREVIEW_WODS = [
  { day: 'Mon', name: 'Back Squat 5×5 + AMRAP 15',    tag: 'Strength'  },
  { day: 'Tue', name: '21-15-9 Thrusters / Pull-ups', tag: 'Metcon'    },
  { day: 'Wed', name: 'EMOM 20 — Gymnastics Focus',   tag: 'Skill'     },
  { day: 'Thu', name: 'Clean & Jerk 1RM + RFT',       tag: 'Olympic'   },
  { day: 'Fri', name: 'Hero WOD — Murph Prep',        tag: 'Endurance' },
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
        <div className="max-w-6xl mx-auto px-8 h-full flex items-center justify-between">
          <KovaLogo size="lg" />
          <div className="flex items-center gap-6">
            <a href="#features"     className="hidden md:block text-sm text-secondary hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hidden md:block text-sm text-secondary hover:text-foreground transition-colors">How It Works</a>
            <ThemeToggle />
            <Link href="/login"  className="hidden sm:block text-sm text-secondary hover:text-foreground transition-colors">Sign In</Link>
            <Link
              href="/signup"
              className="bg-accent text-background px-5 py-2 text-xs font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      {/* Change 2+3+4+8: full-width dot grid bg, larger H1, pain statement */}
      <div
        className="relative"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(184,149,42,0.09) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      >
        {/* Vignette: fades the dot grid at edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 90% 75% at 50% 40%, transparent 20%, var(--color-background) 78%)' }}
        />

        <section className="relative min-h-screen max-w-6xl mx-auto px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p
              className="hero-fade-up text-xs font-semibold tracking-widest text-accent uppercase mb-6"
              style={{ animationDelay: '0.05s' }}
            >
              AI-Powered Gym Programming
            </p>

            {/* Change 2+8: specific, bold headline at larger size */}
            <h1
              className="hero-fade-up font-display text-[3.5rem] lg:text-[4.5rem] font-bold leading-[1.05] tracking-tight text-foreground mb-6"
              style={{ animationDelay: '0.15s' }}
            >
              Program your gym<br />
              <span className="text-accent">in seconds,<br className="hidden lg:block" /> not hours.</span>
            </h1>

            {/* Change 4: lead with the pain, then the solution */}
            <p
              className="hero-fade-up text-base text-secondary leading-relaxed max-w-md mb-9"
              style={{ animationDelay: '0.25s' }}
            >
              Most coaches spend 3–5 hours a week writing workouts. KOVA generates your full weekly program in under 30 seconds — tailored to your coaching style, with every scaling version included.
            </p>

            <div
              className="hero-fade-up flex items-center gap-5 mb-7"
              style={{ animationDelay: '0.35s' }}
            >
              <Link
                href="/signup"
                className="bg-accent text-background px-7 py-3 text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors"
              >
                Create Your Gym
              </Link>
              <Link href="/login" className="text-sm text-secondary border-b border-secondary/40 pb-px hover:text-foreground transition-colors">
                Sign in →
              </Link>
            </div>

            <div
              className="hero-fade-up flex flex-wrap gap-x-5 gap-y-2"
              style={{ animationDelay: '0.45s' }}
            >
              {['Members can book online', 'Auto-scaling for all levels', 'Free to get started'].map(b => (
                <span key={b} className="flex items-center gap-1.5 text-xs text-secondary">
                  <Check size={11} className="text-accent flex-shrink-0" strokeWidth={2.5} />
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-fade-up" style={{ animationDelay: '0.2s' }}>
            <WodCardsHero />
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-secondary/50">Scroll</span>
            <svg className="scroll-bounce text-secondary/50" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </section>
      </div>

      {/* ── PHRASE SPINNER ───────────────────────────────────────────── */}
      <PhraseSpinner />

      {/* ── STATS STRIP ─────────────────────────────────────────────── */}
      {/* Change 7: moved before WodWalkthrough — establishes credibility first */}
      <div className="bg-[#0A0A0A] py-16">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-white/10 divide-y sm:divide-y-0">
          {STATS.map((s, i) => (
            <FadeIn key={s.num} delay={i * 80} className={i > 0 ? 'sm:pl-10' : ''}>
              <div className="py-8 sm:py-0 text-center sm:text-left">
                <p className="font-display text-5xl font-bold text-white tracking-tight mb-2">{s.num}</p>
                <p className="text-sm text-white/40 leading-snug">{s.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>

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
                <p className="text-xs text-secondary mb-3">@ 80% 1RM — 3 min rest between sets</p>
                <div className="border-t border-border pt-3 mb-3">
                  <p className="text-[10px] font-bold tracking-widest text-accent uppercase mb-1.5">AMRAP 15 min</p>
                  <p className="text-xs text-secondary">10 Pull-ups · 15 Box Jumps · 20 KB Swings</p>
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
              <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-4">For Your Members</p>
              <h2 className="font-display text-4xl font-bold text-foreground tracking-tight mb-6">
                Book a class.<br />
                <span className="text-accent">Show up ready.</span>
              </h2>
              <p className="text-base text-secondary leading-relaxed mb-8">
                Members get their own view — browse the week&apos;s WODs, reserve a spot, and check their scaling before they arrive. No app download required.
              </p>
              <ul className="space-y-5">
                {MEMBER_BENEFITS.map(b => (
                  <li key={b.label} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-accent-10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                      <Check size={10} className="text-accent" strokeWidth={2.5} />
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

        {/* Section header */}
        <div className="max-w-6xl mx-auto px-8 pt-24 pb-14">
          <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-4">What KOVA does</p>
          <h2 className="font-display text-4xl font-bold text-foreground tracking-tight">
            Everything your gym needs.<br />
            <span className="text-accent">Nothing it doesn&apos;t.</span>
          </h2>
        </div>

        {/* Change 5: AI Generation hero feature — full-width callout above the grid */}
        <FadeIn>
          <div className="bg-surface border-y border-border">
            <div className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

              {/* Copy */}
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <Zap size={14} className="text-accent" strokeWidth={2} />
                  <span className="text-xs font-bold tracking-widest text-accent uppercase">Signature Feature</span>
                </div>
                <h3 className="font-display text-3xl font-bold text-foreground tracking-tight mb-4">
                  Your whole week,<br />written by AI.
                </h3>
                <p className="text-base text-secondary leading-relaxed mb-6">
                  Tell KOVA your gym&apos;s training style once. It generates balanced, intelligent programming — strength cycles, metcons, skill work, and Olympic lifting — that genuinely matches how you coach.
                </p>
                <div className="flex gap-2 flex-wrap">
                  {['CrossFit', 'Hyrox', 'Strength Focus', 'Skill Bias'].map(tag => (
                    <span key={tag} className="px-3 py-1.5 text-xs font-semibold rounded-btn bg-accent-10 border border-accent/20 text-accent">
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

        {/* Feature grid — remaining capabilities */}
        <div className="max-w-6xl mx-auto px-8 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 60}>
                <div className="h-full bg-surface p-8 hover:bg-surface-raised transition-colors group">
                  <f.icon size={20} className="mb-4 text-accent/70 group-hover:text-accent transition-colors" strokeWidth={1.5} />
                  <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-accent transition-colors">{f.title}</h3>
                  <p className="text-sm text-secondary leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] py-24 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.08) 0%, transparent 65%)' }}
        />
        <div className="relative">
          <h2 className="font-display text-5xl font-bold text-white tracking-tight mb-4">
            Ready to elevate<br />
            <span className="text-accent">your gym?</span>
          </h2>
          <p className="text-white/40 text-base mb-8">Start programming smarter today.</p>
          <Link
            href="/signup"
            className="inline-block bg-accent text-black px-11 py-4 text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors cta-pulse"
          >
            Get Started Free
          </Link>
          <p className="mt-4 text-xs text-white/25 tracking-wide">No credit card required</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="bg-[#0A0A0A] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-8 pt-14 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2">
              <KovaLogo size="sm" />
              <p className="text-xs text-secondary mt-4 max-w-xs leading-relaxed">
                AI-powered gym programming for CrossFit and Hyrox coaches. Less planning, more coaching.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-5">Product</p>
              <ul className="space-y-3">
                {[['Features', '#features'], ['How It Works', '#how-it-works']].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-secondary hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-5">Account</p>
              <ul className="space-y-3">
                {[['Sign In', '/login'], ['Create Gym', '/signup']].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-secondary hover:text-white transition-colors">{label}</a>
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
