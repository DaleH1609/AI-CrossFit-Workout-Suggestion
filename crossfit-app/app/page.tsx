// app/page.tsx
import Link from 'next/link'
import { KovaLogo } from '@/components/ui/kova-logo'

function LandingNav() {
  return (
    <nav className="landing-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 64px', borderBottom: '1px solid rgba(212,175,55,0.15)', position: 'sticky', top: 0, zIndex: 50, background: '#0A0A0A' }}>
      <KovaLogo size="lg" />
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        <a href="#features" style={{ color: '#9CA3AF', textDecoration: 'none', fontSize: 14, letterSpacing: 1 }}>Features</a>
        <Link href="/login" style={{ background: '#D4AF37', color: '#0A0A0A', padding: '8px 20px', fontSize: 13, fontWeight: 700, letterSpacing: 1, textDecoration: 'none' }}>Sign In</Link>
      </div>
    </nav>
  )
}

export default function Home() {
  return (
    <div style={{ background: '#0A0A0A', color: '#fff', minHeight: '100vh', fontFamily: 'var(--font-inter)' }}>
      <style>{`
        @media (max-width: 768px) {
          .landing-nav { padding: 16px 24px !important; }
          .landing-hero { padding: 60px 24px 60px !important; }
          .landing-hero h1 { font-size: 44px !important; }
          .landing-features { padding: 60px 24px !important; }
          .landing-features-grid { grid-template-columns: 1fr !important; }
          .landing-cta { padding: 60px 24px !important; }
          .landing-footer { padding: 24px !important; flex-direction: column !important; gap: 12px !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .landing-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      <LandingNav />

      {/* Hero */}
      <div className="landing-hero" style={{ padding: '120px 64px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontSize: 11, letterSpacing: 4, color: '#D4AF37', textTransform: 'uppercase', marginBottom: 24 }}>
          AI-Powered Gym Programming
        </p>
        <h1 style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, marginBottom: 24, fontFamily: 'var(--font-inter)' }}>
          Train Smarter.<br />
          <span style={{ color: '#D4AF37' }}>Perform Better.</span>
        </h1>
        <p style={{ fontSize: 18, color: '#9CA3AF', maxWidth: 480, lineHeight: 1.7, marginBottom: 40 }}>
          KOVA generates weekly programs tailored to your gym&apos;s coaching style — so you spend less time programming and more time coaching.
        </p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/signup" style={{ background: '#D4AF37', color: '#0A0A0A', padding: '14px 32px', fontSize: 14, fontWeight: 700, letterSpacing: 1, textDecoration: 'none', textTransform: 'uppercase' }}>
            Create Your Gym
          </Link>
          <Link href="/login" style={{ color: '#9CA3AF', fontSize: 14, textDecoration: 'none', borderBottom: '1px solid rgba(156,163,175,0.4)', paddingBottom: 2 }}>
            Sign in →
          </Link>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(212,175,55,0.1)', margin: '0 64px' }} />

      {/* Features */}
      <div id="features" className="landing-features" style={{ padding: '100px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontSize: 11, letterSpacing: 4, color: '#D4AF37', textTransform: 'uppercase', marginBottom: 16 }}>What KOVA does</p>
        <h2 style={{ fontSize: 40, fontWeight: 700, marginBottom: 60, fontFamily: 'var(--font-inter)' }}>
          Everything your gym needs.<br />Nothing it doesn&apos;t.
        </h2>
        <div className="landing-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'rgba(212,175,55,0.15)' }}>
          {[
            { icon: '⚡', title: 'AI Workout Generation', desc: "Generate a full week of WODs in seconds. KOVA learns your gym's style and keeps programming consistent." },
            { icon: '📅', title: 'Class Scheduling', desc: 'Set up recurring class slots, manage capacity, and let members book directly from their phone.' },
            { icon: '👥', title: 'Member Management', desc: 'Invite members, track attendance, and manage your gym community — all in one place.' },
          ].map(f => (
            <div key={f.title} style={{ background: '#0A0A0A', padding: '40px 32px' }}>
              <div style={{ width: 40, height: 40, background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 18 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="landing-cta" style={{ padding: '100px 64px', textAlign: 'center', borderTop: '1px solid rgba(212,175,55,0.1)' }}>
        <h2 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16, fontFamily: 'var(--font-inter)' }}>
          Ready to elevate<br /><span style={{ color: '#D4AF37' }}>your gym?</span>
        </h2>
        <p style={{ color: '#9CA3AF', fontSize: 16, marginBottom: 40 }}>
          Join gym owners already using KOVA to program smarter.
        </p>
        <Link href="/signup" style={{ background: '#D4AF37', color: '#0A0A0A', padding: '14px 32px', fontSize: 14, fontWeight: 700, letterSpacing: 1, textDecoration: 'none', textTransform: 'uppercase' }}>
          Get Started Free
        </Link>
      </div>

      {/* Footer */}
      <footer className="landing-footer" style={{ padding: '32px 64px', borderTop: '1px solid rgba(212,175,55,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <KovaLogo size="sm" />
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>© 2026 KOVA. All rights reserved.</span>
      </footer>
    </div>
  )
}
