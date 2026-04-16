import Link from 'next/link'
import { KovaLogo } from '@/components/ui/kova-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { WodCardsHero } from '@/components/landing/wod-cards-hero'
import { WodWalkthrough } from '@/components/landing/wod-walkthrough'
import { PhraseSpinner } from '@/components/landing/phrase-spinner'

export default function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-screen font-body">

      {/* NAV — bg-background/90 won't work with CSS vars in Tailwind v3; use inline style for opacity */}
      <nav className="sticky top-0 z-50 h-16 backdrop-blur-md border-b border-border"
        style={{ background: 'color-mix(in srgb, var(--color-background) 90%, transparent)' }}>
        <div className="max-w-6xl mx-auto px-8 h-full flex items-center justify-between">
          <KovaLogo size="lg" />
          <div className="flex items-center gap-8">
            <a href="#features" className="hidden md:block text-sm text-secondary hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hidden md:block text-sm text-secondary hover:text-foreground transition-colors">How It Works</a>
            <ThemeToggle />
            <Link
              href="/login"
              className="bg-accent text-background px-5 py-2 text-xs font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-5">AI-Powered Gym Programming</p>
          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-foreground mb-5">
            Train Smarter.<br />
            <span className="text-accent">Perform Better.</span>
          </h1>
          <p className="text-base text-secondary leading-relaxed max-w-md mb-9">
            KOVA generates weekly programs tailored to your gym&apos;s coaching style — so you spend less time programming and more time coaching.
          </p>
          <div className="flex items-center gap-5 mb-12">
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
        </div>

        <WodCardsHero />
      </section>

      <PhraseSpinner />

      <WodWalkthrough />

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-8 py-24 scroll-mt-16">
        <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-4">What KOVA does</p>
        <h2 className="font-display text-4xl font-bold text-foreground tracking-tight mb-14">
          Everything your gym needs.<br />
          <span className="text-accent">Nothing it doesn&apos;t.</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {[
            { title: 'AI Workout Generation', desc: "Generate a full week of WODs in seconds. KOVA learns your gym's style and keeps programming consistent." },
            { title: 'Class Scheduling', desc: 'Set up recurring class slots, manage capacity, and let members book directly from their phone.' },
            { title: 'Member Management', desc: "Invite members, track attendance, and manage your gym community — all in one place." },
            { title: 'Auto-Scaling', desc: 'Every WOD automatically scaled to Rx, Scaled, and Beginner. No more writing three versions.' },
            { title: 'CrossFit & Hyrox', desc: "Built-in programming logic for both gym types. Switch in settings — the AI adapts instantly." },
            { title: 'Full Edit Control', desc: 'AI generates, you approve. Edit any workout before publishing — structured editor or free text.' },
          ].map(f => (
            <div key={f.title} className="bg-surface p-8 hover:bg-surface-raised transition-colors group">
              <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-accent transition-colors">{f.title}</h3>
              <p className="text-sm text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0A0A0A] py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.08) 0%, transparent 65%)' }} />
        <div className="relative">
          <h2 className="font-display text-5xl font-bold text-white tracking-tight mb-4">
            Ready to elevate<br />
            <span className="text-accent">your gym?</span>
          </h2>
          <p className="text-secondary text-base mb-10">Start programming smarter today.</p>
          <Link
            href="/signup"
            className="inline-block bg-accent text-black px-11 py-4 text-sm font-bold tracking-widest uppercase rounded-btn hover:bg-accent-90 transition-colors"
            style={{ boxShadow: '0 12px 40px rgba(212,175,55,0.35)' }}
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0A0A0A] border-t border-white/5 px-8 py-7 flex items-center justify-between">
        <KovaLogo size="sm" />
        <span className="text-xs text-secondary">© 2026 KOVA. All rights reserved.</span>
      </footer>
    </div>
  )
}
