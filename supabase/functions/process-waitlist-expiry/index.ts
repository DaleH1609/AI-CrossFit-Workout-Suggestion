// DEPRECATED — do not deploy.
//
// The authoritative waitlist-expiry cron is the Vercel cron defined in
// vercel.json, served by `app/api/cron/waitlist-expire/route.ts`.
//
// Deploying this Supabase Edge Function alongside the Vercel cron caused
// double-promotion races (two schedulers acting on the same expired booking).
// This stub throws if invoked so it cannot silently duplicate work.

// @ts-nocheck
Deno.serve(() => {
  return new Response(
    'Deprecated: use Vercel cron at /api/cron/waitlist-expire',
    { status: 410 }
  )
})
