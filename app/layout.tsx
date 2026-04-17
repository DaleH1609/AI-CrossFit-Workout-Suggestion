import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: { default: 'KOVA', template: '%s | KOVA' },
  description: 'AI-powered gym programming for CrossFit and Hyrox gyms. Generate weekly WODs in seconds.',
  keywords: ['CrossFit programming', 'Hyrox training', 'gym management', 'WOD generator'],
  openGraph: {
    title: 'KOVA — Train Smarter. Perform Better.',
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
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="bg-background text-foreground font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
