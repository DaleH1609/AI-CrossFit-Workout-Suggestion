# Supabase Edge Functions — DEPRECATED

These Deno-based Edge Functions have been replaced by Vercel Cron jobs that call
Next.js route handlers. See `vercel.json` for the authoritative cron schedule.

| Deprecated edge function | Authoritative replacement |
| --- | --- |
| `generate-class-instances/` | `app/api/cron/generate-instances/route.ts` |
| `process-waitlist-expiry/` | `app/api/cron/waitlist-expire/route.ts` |
| `_shared/waitlist.ts` | `lib/bookings/waitlist.ts` |

**Do not deploy these functions.** Running them in parallel with the Vercel
crons causes double-promotion races (two schedulers acting on the same
`pending_confirmation` row) and duplicate class-instance inserts.

The files remain as stubs that return 410 Gone if invoked, so any stale
deployment becomes safely noisy rather than silently destructive.

To fully remove them, run (locally, with write permission):

```bash
rm -rf supabase/functions/_shared supabase/functions/process-waitlist-expiry supabase/functions/generate-class-instances
```
