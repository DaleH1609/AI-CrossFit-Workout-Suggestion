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

      {/* sections go here */}
    </div>
  )
}
