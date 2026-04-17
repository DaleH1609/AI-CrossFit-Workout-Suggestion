// DEPRECATED — do not use.
//
// The authoritative waitlist promotion logic lives in `lib/bookings/waitlist.ts`
// and runs via the Vercel cron at `app/api/cron/waitlist-expire/route.ts`
// (see vercel.json). This file was a parallel Deno/Supabase Edge Function
// implementation that duplicated logic, lacked HTML escaping (XSS), and
// created double-promotion races when deployed alongside the Vercel cron.
//
// This stub is kept only to avoid breaking any import paths. If you see this
// file being executed, something is wrong — neither Edge Function should be
// deployed. Delete the `supabase/functions/_shared`,
// `supabase/functions/process-waitlist-expiry`, and
// `supabase/functions/generate-class-instances` directories when you get the
// chance.

// @ts-nocheck
export async function promoteNextWaitlistMember(): Promise<void> {
  throw new Error(
    'Deprecated: use lib/bookings/waitlist.ts via the Vercel cron at /api/cron/waitlist-expire'
  )
}
