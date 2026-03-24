// app/layout.tsx
import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-background text-white font-body antialiased">{children}</body>
    </html>
  )
}
