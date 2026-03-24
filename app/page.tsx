import Link from 'next/link'
import { KovaLogo } from '@/components/ui/kova-logo'

export default function HomePage() {
  return (
    <div style={{ background: '#050505', color: '#fff', minHeight: '100vh', fontFamily: 'var(--font-inter)' }}>
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

      {/* NAV */}
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
          {/* Inline stats */}
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
    </div>
  )
}
