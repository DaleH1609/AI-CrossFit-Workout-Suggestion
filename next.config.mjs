import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to every route, including API redirects (N18).
        source: '/(.*)',
        headers: [
          // Prevent this app from being embedded in an iframe (clickjacking).
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing — forces browser to honour Content-Type.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Send full origin only on same-origin requests; redacted on cross-origin.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Opt out of FLoC / Privacy Sandbox ad-tracking APIs.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // HSTS here (not proxy.ts) so API routes get it too — proxy.ts
          // matcher excludes /api/*. 2-year max-age, preload-list eligible.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // Set SENTRY_ORG and SENTRY_PROJECT to enable source-map uploads at build time.
  // Leave unset to skip source-map uploads (still captures runtime errors via DSN).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only upload source maps in CI to keep local builds fast
  uploadSourceMaps: !!process.env.CI && !!process.env.SENTRY_AUTH_TOKEN,
  // Suppress non-essential build output
  silent: !process.env.CI,
  // Don't block the build if Sentry auth token is missing
  errorOnFailedUpload: false,
  widenClientFileUpload: true,
  // Tree-shake the Sentry logger in production builds
  disableLogger: true,
})
