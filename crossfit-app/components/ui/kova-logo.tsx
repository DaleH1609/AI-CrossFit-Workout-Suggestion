// components/ui/kova-logo.tsx

type KovaLogoSize = 'sm' | 'md' | 'lg'

const sizes: Record<KovaLogoSize, { hex: number; fontSize: number; letterSpacing: number; gap: number }> = {
  sm: { hex: 20, fontSize: 14, letterSpacing: 3, gap: 8 },
  md: { hex: 28, fontSize: 18, letterSpacing: 4, gap: 10 },
  lg: { hex: 40, fontSize: 24, letterSpacing: 5, gap: 14 },
}

export function KovaLogo({ size = 'md' }: { size?: KovaLogoSize }) {
  const { hex, fontSize, letterSpacing, gap } = sizes[size]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <div
        style={{
          width: hex,
          height: hex,
          background: 'linear-gradient(135deg, #D4AF37, #F5D060)',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          flexShrink: 0,
          boxShadow: '0 0 12px rgba(212,175,55,0.5)',
        }}
      />
      <span
        style={{
          fontSize,
          letterSpacing,
          fontWeight: 800,
          color: '#ffffff',
          fontFamily: 'var(--font-inter)',
          textTransform: 'uppercase' as const,
          lineHeight: 1,
        }}
      >
        KOVA
      </span>
    </div>
  )
}
