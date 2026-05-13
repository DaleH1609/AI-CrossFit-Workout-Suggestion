// instrumentation.ts — Next.js instrumentation hook.
// Next.js calls register() once when the server process starts.
// Dynamic imports keep each runtime's Sentry SDK out of the wrong bundle.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
