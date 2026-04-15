import Link from 'next/link'
import { KovaLogo } from '@/components/ui/kova-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { WodCardsHero } from '@/components/landing/wod-cards-hero'

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
          <div className="flex gap-8 pt-8 border-t border-border">
            {[
              { value: '500+', label: 'Gyms' },
              { value: '10K+', label: 'Members' },
              { value: '50K+', label: 'WODs Generated' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-xl font-bold text-accent">{s.value}</div>
                <div className="text-xs text-secondary tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <WodCardsHero />
      </section>

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

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-8 py-24 scroll-mt-16">
        <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-4">The process</p>
        <h2 className="font-display text-4xl font-bold text-foreground tracking-tight mb-14">
          From idea to published<br />
          <span className="text-accent">in three steps.</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
          {[
            { num: '01', title: 'Generate', desc: "Tell KOVA your gym type and coaching style. The AI generates a full week of structured WODs in under 30 seconds." },
            { num: '02', title: 'Review & Edit', desc: "Every workout is editable before it goes live. Swap movements, adjust loads, add coaching notes. Your program, refined by AI." },
            { num: '03', title: 'Publish', desc: "Approve the week and your members instantly see it. Auto-scaled versions for Rx, Scaled, and Beginner generated automatically." },
          ].map(step => (
            <div key={step.num} className="bg-surface p-10">
              <div className="text-6xl font-black text-border leading-none mb-5">{step.num}</div>
              <h3 className="text-lg font-bold text-foreground mb-3">{step.title}</h3>
              <p className="text-sm text-secondary leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

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

      {/* CTA */}
      <section className="bg-[#0A0A0A] py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.08) 0%, transparent 65%)' }} />
        <div className="relative">
          <h2 className="font-display text-5xl font-bold text-white tracking-tight mb-4">
            Ready to elevate<br />
            <span className="text-accent">your gym?</span>
          </h2>
          <p className="text-secondary text-base mb-10">Join gym owners already using KOVA to program smarter.</p>
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
