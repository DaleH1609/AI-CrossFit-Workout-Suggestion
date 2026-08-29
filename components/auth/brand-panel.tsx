import { KovaLogo } from '@/components/ui/kova-logo'

export function AuthBrandPanel() {
  return (
    <>
      <style>{`
        @keyframes kova-blob {
          0%   { transform: translate(0px,  0px)   scale(1);    }
          33%  { transform: translate(22px, -16px)  scale(1.06); }
          66%  { transform: translate(-12px, 22px)  scale(0.96); }
          100% { transform: translate(14px, -8px)   scale(1.03); }
        }
      `}</style>

      <div
        className="hidden lg:flex w-3/5 flex-col justify-between p-12"
        style={{ background: '#ffffff', position: 'relative', overflow: 'hidden' }}
      >
        {/* Gradient mesh blobs */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute',
            width: 420, height: 420,
            top: -120, left: -80,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.28) 0%, rgba(212,175,55,0.06) 55%, transparent 75%)',
            filter: 'blur(48px)',
            mixBlendMode: 'multiply',
            animation: 'kova-blob 9s ease-fluid infinite alternate',
          }} />
          <div style={{
            position: 'absolute',
            width: 300, height: 300,
            top: 60, right: -60,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,130,30,0.20) 0%, transparent 70%)',
            filter: 'blur(40px)',
            mixBlendMode: 'multiply',
            animation: 'kova-blob 12s ease-fluid infinite alternate',
            animationDelay: '-4s',
          }} />
          <div style={{
            position: 'absolute',
            width: 360, height: 360,
            bottom: -80, left: '30%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(240,200,70,0.18) 0%, transparent 65%)',
            filter: 'blur(52px)',
            mixBlendMode: 'multiply',
            animation: 'kova-blob 14s ease-fluid infinite alternate',
            animationDelay: '-7s',
          }} />
        </div>

        <div className="relative">
          <KovaLogo size="md" variant="dark" />
        </div>

        <div className="relative">
          <p className="font-display text-4xl font-bold leading-snug mb-4" style={{ color: '#111111' }}>
            Your program,<br />refined by AI.
          </p>
          <p className="text-sm" style={{ color: 'rgba(0,0,0,0.4)' }}>
            Trusted by 500+ gyms worldwide.
          </p>
        </div>
      </div>
    </>
  )
}
