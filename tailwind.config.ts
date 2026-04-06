import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: '#141414',
        accent: '#D4AF37',
        'accent-border': 'rgba(212,175,55,0.2)',
        danger: '#EF4444',
        secondary: '#9CA3AF',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        btn: '4px',
      },
    },
  },
  plugins: [],
}
export default config
