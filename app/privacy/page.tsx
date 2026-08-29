import Link from 'next/link'
import { KovaLogo } from '@/components/ui/kova-logo'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  const email = process.env.SUPPORT_EMAIL ?? 'hello@getkova.com'
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border px-8 h-16 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/"><KovaLogo size="md" /></Link>
        <Link href="/login" className="text-sm text-secondary hover:text-foreground transition-colors">Sign in</Link>
      </nav>

      <main className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="font-display text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-secondary text-sm mb-12">Last updated: April 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed text-secondary">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Who We Are</h2>
            <p>KOVA (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the gym management platform at this domain. For questions about this policy, contact us at <a href={`mailto:${email}`} className="text-accent hover:underline">{email}</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. What We Collect</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong className="text-foreground">Account data</strong> - email address and password (hashed) when you create an account.</li>
              <li><strong className="text-foreground">Gym data</strong> - gym name, timezone, and gym type you provide during setup.</li>
              <li><strong className="text-foreground">Member data</strong> - names and emails of members you invite to your gym.</li>
              <li><strong className="text-foreground">Booking data</strong> - class bookings, attendance records, and waitlist positions.</li>
              <li><strong className="text-foreground">Workout content</strong> - style examples you upload and AI-generated workouts.</li>
              <li><strong className="text-foreground">Usage data</strong> - server logs including IP addresses and request timestamps, retained for up to 90 days.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. How We Use It</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>To provide, operate, and improve the Service.</li>
              <li>To send transactional emails (booking confirmations, workout notifications) that you configure.</li>
              <li>To generate AI workouts using Anthropic&apos;s Claude API. Your style examples and workout history are sent to Anthropic to generate programming. We do not send member personal data to Anthropic.</li>
              <li>To send you important account or product updates.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. Sub-processors</h2>
            <p className="mb-3">We use the following sub-processors to operate the Service. Each processes personal data only to the extent necessary to perform its function, and each maintains a Data Processing Agreement (DPA) covering EU/UK GDPR obligations.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong className="text-foreground">Supabase</strong> - database and authentication hosting.{' '}
                <a href="https://supabase.com/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">DPA</a>
              </li>
              <li>
                <strong className="text-foreground">Vercel</strong> - hosting and infrastructure.{' '}
                <a href="https://vercel.com/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">DPA</a>
              </li>
              <li>
                <strong className="text-foreground">Resend</strong> - transactional email delivery.{' '}
                <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Privacy Policy</a>
              </li>
              <li>
                <strong className="text-foreground">Anthropic</strong> - AI workout generation. Workout style examples and programming context are sent to Anthropic; member personal data (names, emails) is never included.{' '}
                <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Privacy Policy</a>
              </li>
              <li>
                <strong className="text-foreground">Upstash</strong> - Redis caching and rate limiting (request counts only; no personal data is stored).{' '}
                <a href="https://upstash.com/trust/dpa.pdf" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">DPA</a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. Data Retention</h2>
            <p>We retain your data for as long as your account is active. When you delete your account, all gym data, member records, bookings, and workouts are permanently deleted within 30 days. Supabase authentication records are deleted immediately.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Your Rights</h2>
            <p>Depending on where you are located, you may have rights to access, correct, or delete your personal data, or to object to or restrict certain processing. To exercise these rights, email us at <a href={`mailto:${email}`} className="text-accent hover:underline">{email}</a>. Gym owners can also delete their account and all associated data directly from the Settings page.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">7. Security</h2>
            <p>We use industry-standard measures to protect your data, including encrypted connections (TLS), hashed passwords, and row-level security policies on our database. No method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">8. Changes</h2>
            <p>We may update this policy. We will notify you by email before material changes take effect.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">9. Contact</h2>
            <p>Email us at <a href={`mailto:${email}`} className="text-accent hover:underline">{email}</a> with any privacy questions.</p>
          </section>
        </div>
      </main>
    </div>
  )
}
