import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ServiceWorkerRegister } from '@/components/push/service-worker-register'
import { CookieBanner } from '@/components/ui/cookie-banner'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
// Technical labels (phase readouts, section eyebrows, counters) are set in mono.
// Pinned to a real face so letterspacing is consistent across platforms rather
// than inheriting whatever ui-monospace resolves to.
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: { default: 'KOVA', template: '%s | KOVA' },
  description: 'AI-powered gym programming for CrossFit and Hyrox gyms. Generate weekly WODs in seconds.',
  keywords: ['CrossFit programming', 'Hyrox training', 'gym management', 'WOD generator'],
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'KOVA' },
  openGraph: {
    title: 'KOVA - Train Smarter. Perform Better.',
    description: 'AI-powered gym programming for CrossFit and Hyrox gyms.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

// Viewport is a separate export in Next.js 14 metadata API. Mobile-first layout
// is useless without width=device-width — review flagged this as a critical
// rendering bug on phones (half-zoom zoomed-in renders).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${dmSans.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="bg-background text-foreground font-body antialiased">
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
        <CookieBanner />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
