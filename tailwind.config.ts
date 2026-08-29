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
        'danger-10':      'var(--color-danger-10)',
        'danger-20':      'var(--color-danger-20)',
        'danger-30':      'var(--color-danger-30)',
        'danger-40':      'var(--color-danger-40)',
        'danger-60':      'var(--color-danger-60)',
        'danger-70':      'var(--color-danger-70)',
        success:          'var(--color-success)',
        'success-10':     'var(--color-success-10)',
        'success-20':     'var(--color-success-20)',
        'success-40':     'var(--color-success-40)',
        warning:          'var(--color-warning)',
        'warning-10':     'var(--color-warning-10)',
        'warning-20':     'var(--color-warning-20)',
        'warning-40':     'var(--color-warning-40)',
        'secondary-60':   'var(--color-secondary-60)',
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        body:    ['var(--font-dm-sans)', 'sans-serif'],
        mono:    ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // Squircle scale. 8px card / 4px btn read as a bootstrap default; the
        // larger radii are what make a surface feel like an object.
        card:     '14px',
        'card-lg':'20px',
        squircle: 'var(--radius-squircle)',
        btn:      '10px',
      },
      transitionTimingFunction: {
        fluid: 'var(--ease-fluid)',
        expo:  'var(--ease-out-expo)',
        spring:'var(--ease-spring)',
      },
      boxShadow: {
        ambient: 'var(--shadow-ambient)',
        lift:    'var(--shadow-lift)',
        'inset-hi': 'var(--shadow-inset-hi)',
      },
      transitionDuration: {
        400: '400ms',
        600: '600ms',
        800: '800ms',
      },
    },
  },
  plugins: [],
}
export default config
