// components/ui/kova-logo.tsx

type KovaLogoSize = 'sm' | 'md' | 'lg'

const sizes: Record<KovaLogoSize, { slashW: number; slashH: number; fontSize: number; letterSpacing: number; gap: number }> = {
  sm: { slashW: 10, slashH: 18, fontSize: 18, letterSpacing: 3, gap: 7 },
  md: { slashW: 13, slashH: 24, fontSize: 24, letterSpacing: 4, gap: 9 },
  lg: { slashW: 18, slashH: 34, fontSize: 34, letterSpacing: 5, gap: 12 },
}

export function KovaLogo({ size = 'md', variant = 'light' }: { size?: KovaLogoSize; variant?: 'light' | 'dark' }) {
  const { slashW, slashH, fontSize, letterSpacing, gap } = sizes[size]
  const textColor = variant === 'dark' ? '#0A0A0A' : '#FFFFFF'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <svg
        width={slashW}
        height={slashH}
        viewBox="0 0 18 34"
        fill="none"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="slash-grad" x1="0" y1="0" x2="18" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5D060" />
            <stop offset="100%" stopColor="#B8952A" />
          </linearGradient>
        </defs>
        <polygon points="5,0 18,0 13,34 0,34" fill="url(#slash-grad)" />
      </svg>
      <span
        style={{
          fontSize,
          letterSpacing,
          fontWeight: 400,
          color: textColor,
          fontFamily: 'var(--font-bebas)',
          textTransform: 'uppercase' as const,
          lineHeight: 1,
        }}
      >
        KOVA
      </span>
    </div>
  )
}
