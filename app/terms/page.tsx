import Link from 'next/link'
import { KovaLogo } from '@/components/ui/kova-logo'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  const email = process.env.SUPPORT_EMAIL ?? 'hello@getkova.com'
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border px-8 h-16 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/"><KovaLogo size="md" /></Link>
        <Link href="/login" className="text-sm text-secondary hover:text-foreground transition-colors">Sign in</Link>
      </nav>

      <main className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="font-display text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-secondary text-sm mb-12">Last updated: April 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed text-secondary">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Agreement</h2>
            <p>By creating an account or using KOVA (&quot;the Service&quot;), you agree to these Terms. If you are using the Service on behalf of a business, you represent that you have authority to bind that business to these Terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. The Service</h2>
            <p>KOVA is a gym management platform that provides AI-generated workout programming, class scheduling, and member booking tools for CrossFit and Hyrox gyms. The AI features are powered by Anthropic&apos;s Claude and are provided as-is. You are responsible for reviewing and approving all AI-generated content before publishing it to your members.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. Your Account</h2>
            <p>You are responsible for keeping your login credentials secure and for all activity that occurs under your account. Notify us immediately at <a href={`mailto:${email}`} className="text-accent hover:underline">{email}</a> if you suspect unauthorised access.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. Acceptable Use</h2>
            <p>You agree not to: (a) use the Service for any unlawful purpose; (b) upload content that infringes third-party intellectual property rights; (c) attempt to reverse engineer, scrape, or access the Service through automated means other than our API; or (d) use the AI features to generate content that is harmful, misleading, or in violation of applicable law.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. Member Data</h2>
            <p>As a gym owner using KOVA, you are the data controller for your members&apos; personal information (names, email addresses, booking history). You are responsible for obtaining appropriate consent from your members to collect and process their data, and for complying with applicable privacy laws (including GDPR if you operate in the EU/UK).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Payments</h2>
            <p>Subscription fees (if applicable) are billed in advance on a monthly or annual basis. Fees are non-refundable except where required by law. We reserve the right to change pricing with 30 days&apos; notice.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">7. Termination</h2>
            <p>You may delete your account at any time from the Settings page. We may suspend or terminate accounts that violate these Terms. Upon termination, your data will be deleted in accordance with our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">8. Disclaimer of Warranties</h2>
            <p>The Service is provided &quot;as is&quot; without warranties of any kind. AI-generated workout programming is not a substitute for professional coaching advice. We do not warrant that the Service will be error-free, uninterrupted, or free of security vulnerabilities.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, KOVA shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability shall not exceed the fees you paid in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">10. Changes</h2>
            <p>We may update these Terms. We will notify you by email at least 14 days before material changes take effect. Continued use of the Service after the effective date constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">11. Contact</h2>
            <p>Questions? Email us at <a href={`mailto:${email}`} className="text-accent hover:underline">{email}</a>.</p>
          </section>
        </div>
      </main>
    </div>
  )
}
