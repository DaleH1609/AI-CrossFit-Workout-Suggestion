// sentry.client.config.ts — browser-side Sentry initialisation.
// Loaded automatically by @sentry/nextjs when the Next.js client bundle starts.

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // No-op gracefully when NEXT_PUBLIC_SENTRY_DSN is not set (local dev without Sentry)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Capture 10 % of traces — enough for performance insight without cost overhead
  tracesSampleRate: 0.1,
  // Capture 100 % of session replays on errors (none on normal sessions)
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
})
