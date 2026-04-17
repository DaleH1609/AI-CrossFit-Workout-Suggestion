// DEPRECATED — do not deploy.
//
// The authoritative class-instance generation cron is the Vercel cron defined
// in vercel.json, served by `app/api/cron/generate-instances/route.ts`.
//
// Deploying this Supabase Edge Function alongside the Vercel cron caused
// duplicate inserts and divergent timezone handling. This stub throws if
// invoked so it cannot silently duplicate work.

// @ts-nocheck
Deno.serve(() => {
  return new Response(
    'Deprecated: use Vercel cron at /api/cron/generate-instances',
    { status: 410 }
  )
})
