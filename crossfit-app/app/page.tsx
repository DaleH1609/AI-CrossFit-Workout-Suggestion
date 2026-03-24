// app/page.tsx
import Link from 'next/link'
import { KovaLogo } from '@/components/ui/kova-logo'

function LandingNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur border-b border-accent-border">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <KovaLogo size="lg" />
        <div className="flex items-center gap-6">
          <a
            href="#features"
            className="text-secondary hover:text-white text-sm transition-colors"
          >
            Features
          </a>
          <Link
            href="/login"
            className="px-4 py-2 bg-accent text-background text-sm font-semibold rounded-btn hover:bg-accent/90 transition-colors"
            style={{ color: '#0A0A0A' }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-white">
      <LandingNav />

      {/* Hero */}
      <section className="pt-40 pb-28 px-6 flex flex-col items-center text-center max-w-4xl mx-auto">
        <p
          className="text-accent text-xs font-semibold uppercase tracking-widest mb-6"
        >
          AI-Powered Gym Programming
        </p>
        <h1 className="font-display text-6xl md:text-7xl font-bold leading-tight mb-6">
          Train Smarter.{' '}
          <span className="text-accent">Perform Better.</span>
        </h1>
        <p className="text-secondary text-lg max-w-2xl mb-10 leading-relaxed">
          KOVA generates weekly CrossFit programs tailored to your gym&apos;s coaching style — so you spend less time programming and more time coaching.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/signup"
            className="px-8 py-3 bg-accent font-semibold text-sm tracking-widest uppercase rounded-btn hover:bg-accent/90 transition-colors"
            style={{ color: '#0A0A0A' }}
          >
            Create Your Gym
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 border border-accent-border text-secondary text-sm hover:text-white hover:border-accent transition-colors rounded-btn"
          >
            Sign in &rarr;
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-accent text-xs font-semibold uppercase tracking-widest text-center mb-4">
            What KOVA does
          </p>
          <h2 className="font-display text-4xl font-bold text-center mb-16">
            Everything your gym needs.{' '}
            <span className="text-secondary">Nothing it doesn&apos;t.</span>
          </h2>
          {/* 3-column grid with 1px gold dividers via rgba wrapper + 1px gap */}
          <div
            className="rounded-card overflow-hidden"
            style={{ backgroundColor: 'rgba(212,175,55,0.2)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px' }}
          >
            {/* Card 1 */}
            <div className="bg-surface p-8">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="font-display text-xl font-semibold text-white mb-3">
                AI Workout Generation
              </h3>
              <p className="text-secondary text-sm leading-relaxed">
                Generate a full week of WODs in seconds. KOVA learns your gym&apos;s style and keeps programming consistent.
              </p>
            </div>
            {/* Card 2 */}
            <div className="bg-surface p-8">
              <div className="text-3xl mb-4">📅</div>
              <h3 className="font-display text-xl font-semibold text-white mb-3">
                Class Scheduling
              </h3>
              <p className="text-secondary text-sm leading-relaxed">
                Set up recurring class slots, manage capacity, and let members book directly from their phone.
              </p>
            </div>
            {/* Card 3 */}
            <div className="bg-surface p-8">
              <div className="text-3xl mb-4">👥</div>
              <h3 className="font-display text-xl font-semibold text-white mb-3">
                Member Management
              </h3>
              <p className="text-secondary text-sm leading-relaxed">
                Invite members, track attendance, and manage your gym community — all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-4xl font-bold mb-4">
            Ready to elevate{' '}
            <span className="text-accent">your gym?</span>
          </h2>
          <p className="text-secondary mb-10">
            Join gym owners already using KOVA to program smarter.
          </p>
          <Link
            href="/signup"
            className="inline-block px-10 py-4 bg-accent font-semibold text-sm tracking-widest uppercase rounded-btn hover:bg-accent/90 transition-colors"
            style={{ color: '#0A0A0A' }}
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-accent-border px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <KovaLogo size="sm" />
          <p className="text-secondary text-sm">
            &copy; 2026 KOVA. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
