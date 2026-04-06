import Link from 'next/link'
import { KovaLogo } from '@/components/ui/kova-logo'

export default function HomePage() {
  return (
    <div style={{ background: '#060608', color: '#fff', minHeight: '100vh', fontFamily: 'var(--font-inter)' }}>
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
        background: 'rgba(6,6,8,0.92)', backdropFilter: 'blur(20px)',
      }}>
        <KovaLogo size="lg" />
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <a href="#features" className="landing-nav-link" style={{ color: '#666', fontSize: 13, textDecoration: 'none' }}>Features</a>
          <a href="#how-it-works" className="landing-nav-link" style={{ color: '#666', fontSize: 13, textDecoration: 'none' }}>How It Works</a>
          <Link href="/login" style={{
            background: 'linear-gradient(135deg, #D4AF37, #F5D060)', color: '#000', padding: '8px 20px',
            fontSize: 12, fontWeight: 700, letterSpacing: 1, textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(212,175,55,0.35), 0 2px 8px rgba(212,175,55,0.2)',
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
          position: 'absolute', top: 0, right: 0, width: 700, height: 700,
          background: 'radial-gradient(circle at 70% 40%, rgba(212,175,55,0.1) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        {/* Secondary glow — indigo */}
        <div style={{
          position: 'absolute', bottom: -100, left: -80, width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        {/* Left: text */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 11, letterSpacing: 4, color: '#D4AF37', textTransform: 'uppercase', marginBottom: 20 }}>
            AI-Powered Gym Programming
          </p>
          <h1 style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, marginBottom: 20 }}>
            Train Smarter.<br />
            <span style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #F5D060 50%, #D4AF37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Perform Better.</span>
          </h1>
          <p style={{ fontSize: 16, color: '#9CA3AF', lineHeight: 1.7, maxWidth: 380, marginBottom: 36 }}>
            KOVA generates weekly programs tailored to your gym&apos;s coaching style — so you spend less time programming and more time coaching.
          </p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 48 }}>
            <Link href="/signup" style={{
              background: 'linear-gradient(135deg, #D4AF37, #F5D060)', color: '#000', padding: '13px 28px',
              fontSize: 13, fontWeight: 700, letterSpacing: 1, textDecoration: 'none', textTransform: 'uppercase',
              boxShadow: '0 8px 32px rgba(212,175,55,0.35), 0 2px 8px rgba(212,175,55,0.2)',
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
                <div style={{
                  fontSize: 22, fontWeight: 800,
                  background: 'linear-gradient(135deg, #D4AF37 0%, #F5D060 50%, #D4AF37 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#555', letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: App preview */}
        <div className="landing-app-preview" style={{
          background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
          overflow: 'hidden', position: 'relative', zIndex: 1,
          boxShadow: '0 60px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.07), inset 0 1px 0 rgba(212,175,55,0.15)',
        }}>
          {/* Top gold line */}
          <div style={{
            position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, zIndex: 1,
            background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.6), transparent)',
            pointerEvents: 'none',
          }} />
          {/* App bar */}
          <div style={{
            background: '#080810', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
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
              <div key={day} style={{ background: 'linear-gradient(180deg, #111118 0%, #0e0e14 100%)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4, padding: 8 }}>
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
              background: 'linear-gradient(135deg, #D4AF37, #F5D060)', color: '#000', fontSize: 8, boxShadow: '0 4px 12px rgba(212,175,55,0.25)',
              padding: '4px 10px', fontWeight: 700, letterSpacing: 1,
            }}>APPROVE &amp; PUBLISH</span>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="landing-stats-bar" style={{
        padding: '24px 64px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'linear-gradient(180deg, rgba(212,175,55,0.025) 0%, transparent 100%)',
        display: 'flex', justifyContent: 'center', gap: 80, alignItems: 'center',
      }}>
        {[
          { value: '< 30s', label: 'TO GENERATE A FULL WEEK' },
          null,
          { value: 'CrossFit + Hyrox', label: 'SUPPORTED GYM TYPES' },
          null,
          { value: 'Rx / Scaled / Beginner', label: 'AUTO-SCALED FOR EVERY ATHLETE' },
        ].map((item, i) =>
          item === null ? (
            <div key={i} className="divider" style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
          ) : (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div className="landing-stats-num" style={{
                fontSize: 28, fontWeight: 800, letterSpacing: -1,
                background: 'linear-gradient(135deg, #D4AF37 0%, #F5D060 50%, #D4AF37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>{item.value}</div>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{item.label}</div>
            </div>
          )
        )}
      </div>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="landing-section" style={{
        maxWidth: 1200, margin: '0 auto', padding: '100px 64px', scrollMarginTop: 64,
      }}>
        <p style={{ fontSize: 11, letterSpacing: 4, color: '#D4AF37', textTransform: 'uppercase', marginBottom: 16 }}>
          The process
        </p>
        <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, marginBottom: 60 }}>
          From idea to published<br />
          <span style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5D060 50%, #D4AF37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>in three steps.</span>
        </h2>
        <div className="landing-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 2, background: 'rgba(255,255,255,0.04)', overflow: 'visible',
        }}>
          {[
            {
              num: '01', icon: '⚡', title: 'Generate',
              desc: "Tell KOVA your gym type and coaching style. The AI generates a full week of structured WODs — strength, metcons, and skill work — in under 30 seconds.",
              connector: true,
            },
            {
              num: '02', icon: '✏️', title: 'Review & Edit',
              desc: "Every workout is editable before it goes live. Swap movements, adjust loads, add coaching notes. Your program, refined by AI.",
              connector: true,
            },
            {
              num: '03', icon: '✓', title: 'Publish',
              desc: "Approve the week and your members instantly see it. Auto-scaled versions for Rx, Scaled, and Beginner athletes — generated automatically.",
              connector: false,
            },
          ].map(step => (
            <div key={step.num} style={{ background: '#050505', padding: '40px 32px', position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.15), transparent)',
                pointerEvents: 'none',
              }} />
              <div style={{ fontSize: 56, fontWeight: 900, color: 'rgba(212,175,55,0.08)', letterSpacing: -2, lineHeight: 1, marginBottom: 20 }}>
                {step.num}
              </div>
              <div style={{
                width: 40, height: 40,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))',
                border: '1px solid rgba(212,175,55,0.15)',
                borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, marginBottom: 16,
              }}>{step.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.7 }}>{step.desc}</p>
              {step.connector && (
                <div style={{
                  position: 'absolute', right: -2, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 40, zIndex: 1,
                  background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,0.3), transparent)',
                }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="landing-section" style={{
        maxWidth: 1200, margin: '0 auto', padding: '100px 64px', scrollMarginTop: 64,
      }}>
        <p style={{ fontSize: 11, letterSpacing: 4, color: '#D4AF37', textTransform: 'uppercase', marginBottom: 16 }}>
          What KOVA does
        </p>
        <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, marginBottom: 60 }}>
          Everything your gym needs.<br />
          <span style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5D060 50%, #D4AF37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Nothing it doesn&apos;t.</span>
        </h2>
        <div className="landing-grid landing-features-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 2, background: 'rgba(255,255,255,0.04)',
        }}>
          {[
            { icon: '⚡', title: 'AI Workout Generation', desc: "Generate a full week of WODs in seconds. KOVA learns your gym's style and keeps programming consistent — week after week." },
            { icon: '📅', title: 'Class Scheduling', desc: 'Set up recurring class slots, manage capacity, and let members book directly from their phone up to 2 days in advance.' },
            { icon: '👥', title: 'Member Management', desc: "Invite members, track attendance, and manage your gym community — all in one place. Waitlists handled automatically." },
            { icon: '🎯', title: 'Auto-Scaling', desc: 'Every WOD automatically scaled to Rx, Scaled, and Beginner. No more writing three versions of the same workout.' },
            { icon: '🏋️', title: 'CrossFit & Hyrox', desc: "Built-in programming logic for both CrossFit and Hyrox gyms. Switch gym type in settings — the AI adapts instantly." },
            { icon: '✏️', title: 'Full Edit Control', desc: 'AI generates, you approve. Edit any workout before publishing — structured editor or free text, your choice.' },
          ].map(f => (
            <div key={f.title} style={{ background: '#050505', padding: '40px 32px', position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.15), transparent)',
                pointerEvents: 'none',
              }} />
              <div style={{
                width: 40, height: 40,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))',
                border: '1px solid rgba(212,175,55,0.15)',
                borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, marginBottom: 20,
              }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        textAlign: 'center', padding: '100px 64px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 700, height: 400, pointerEvents: 'none',
          background: 'radial-gradient(ellipse, rgba(212,175,55,0.08) 0%, transparent 65%)',
        }} />
        <h2 className="landing-cta-headline" style={{
          fontSize: 56, fontWeight: 800, letterSpacing: -2, marginBottom: 16, position: 'relative',
        }}>
          Ready to elevate<br />
          <span style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5D060 50%, #D4AF37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>your gym?</span>
        </h2>
        <p style={{ color: '#9CA3AF', fontSize: 16, marginBottom: 40, position: 'relative' }}>
          Join gym owners already using KOVA to program smarter.
        </p>
        <Link href="/signup" style={{
          background: 'linear-gradient(135deg, #D4AF37, #F5D060)', color: '#000', padding: '16px 44px',
          fontSize: 14, fontWeight: 700, letterSpacing: 1,
          textTransform: 'uppercase', textDecoration: 'none',
          display: 'inline-block', position: 'relative',
          boxShadow: '0 12px 40px rgba(212,175,55,0.4), 0 4px 12px rgba(212,175,55,0.2)',
        }}>Get Started Free</Link>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: '28px 64px', borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <KovaLogo size="sm" />
        <span style={{ fontSize: 12, color: '#444' }}>© 2026 KOVA. All rights reserved.</span>
      </footer>
    </div>
  )
}
