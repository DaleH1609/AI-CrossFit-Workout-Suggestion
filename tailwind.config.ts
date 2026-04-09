import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background:       'var(--color-background)',
        surface:          'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        foreground:       'var(--color-foreground)',
        'foreground-70':  'var(--color-foreground-70)',
        'foreground-50':  'var(--color-foreground-50)',
        'foreground-10':  'var(--color-foreground-10)',
        secondary:        'var(--color-secondary)',
        accent:           'var(--color-accent)',
        'accent-5':       'var(--color-accent-5)',
        'accent-8':       'var(--color-accent-8)',
        'accent-10':      'var(--color-accent-10)',
        'accent-15':      'var(--color-accent-15)',
        'accent-20':      'var(--color-accent-20)',
        'accent-25':      'var(--color-accent-25)',
        'accent-30':      'var(--color-accent-30)',
        'accent-35':      'var(--color-accent-35)',
        'accent-40':      'var(--color-accent-40)',
        'accent-50':      'var(--color-accent-50)',
        'accent-90':      'var(--color-accent-90)',
        border:           'var(--color-border)',
        danger:           'var(--color-danger)',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'serif'],
        body:    ['var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        btn:  '4px',
      },
    },
  },
  plugins: [],
}
export default config
