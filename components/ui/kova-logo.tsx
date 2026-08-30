// components/ui/kova-logo.tsx

type KovaLogoSize = 'sm' | 'md' | 'lg'

const sizes: Record<KovaLogoSize, { slashW: number; slashH: number; fontSize: number; letterSpacing: number; gap: number }> = {
  sm: { slashW: 10, slashH: 18, fontSize: 18, letterSpacing: 3, gap: 7 },
  md: { slashW: 13, slashH: 24, fontSize: 24, letterSpacing: 4, gap: 9 },
  lg: { slashW: 18, slashH: 34, fontSize: 34, letterSpacing: 5, gap: 12 },
}

/**
 * variant defaults to 'auto', which renders the wordmark in currentColor so it
 * inherits whatever text colour its surface already uses.
 *
 * It used to default to 'light', a hardcoded #FFFFFF. That was invisible on
 * every light-themed surface — the landing header, the auth pages, the
 * sidebars — because white text was being painted onto a white background.
 * Nothing threw and nothing looked broken in dark mode, which is why it
 * survived.
 *
 * The explicit variants remain for the two places that sit on a background
 * pinned to one colour regardless of theme: 'light' for the near-black footer
 * band, 'dark' for the accent brand panel.
 */
export function KovaLogo({ size = 'md', variant = 'auto' }: { size?: KovaLogoSize; variant?: 'auto' | 'light' | 'dark' }) {
  const { slashW, slashH, fontSize, letterSpacing, gap } = sizes[size]
  const textColor = variant === 'auto' ? 'currentColor' : variant === 'dark' ? '#0B0B0C' : '#FFFFFF'
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
            <stop offset="0%" stopColor="#E4FF8F" />
            <stop offset="100%" stopColor="#55730F" />
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
