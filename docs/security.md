# Security operations

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `BOOKING_TOKEN_SECRET` | yes (production) | HMAC key used to sign waitlist confirmation tokens. Must be at least 16 characters; 32+ bytes of random entropy recommended (`openssl rand -base64 32`). |
| `CRON_SECRET` | yes | Shared bearer secret for Vercel cron invocations of `/api/cron/*`. |
| `RESEND_FROM_EMAIL` | yes (any env sending email) | Verified Resend sender — the app now fails loud if this is unset. |
| `RESEND_API_KEY` | yes (any env sending email) | Resend API key. |
| `NEXT_PUBLIC_APP_URL` | yes | Base URL included in confirmation links — must match the public hostname. |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Standard Supabase config. |

## Booking confirmation tokens

Tokens are `v1.<base64url(payload)>.<base64url(hmac-sha256)>` where `payload`
is `{ b: bookingId, e: expiresAtMs }`. Verification checks the signature
(constant-time compare) and the expiry before any database lookup, so tampered
tokens fail fast with a generic "invalid or expired" redirect — no 500, no
information leak.

The plain `confirmation_token` column is still written for audit but is no
longer trusted as the lookup key. Rows are located by the decoded `bookingId`
and the `status = 'pending_confirmation'` filter ensures a token can't be
replayed after confirmation or cancellation.

### Rotating `BOOKING_TOKEN_SECRET`

1. Generate a new secret: `openssl rand -base64 32`.
2. Update the Vercel env var (or your hosting provider equivalent). Redeploy.
3. In-flight tokens signed with the old secret will fail verification on click.
   Those bookings stay in `pending_confirmation` until the
   `cron/waitlist-expire` sweep cancels them (≤2 hours) and promotes the next
   person. No manual cleanup needed.
4. Avoid rotating during peak booking hours to minimise user-visible failures.

## Cron authentication

`/api/cron/*` handlers require `Authorization: Bearer ${CRON_SECRET}`. Vercel's
built-in cron sends this header automatically when the cron secret is attached
to the cron job. If you expose the cron URL to a third-party scheduler, share
the same secret.

To rotate: set a new `CRON_SECRET`, redeploy, update any external schedulers.
There is no graceful rollover — rotate during a quiet window.

Optional hardening (future): switch to Vercel's `x-vercel-signature` once all
cron callers are on Vercel's native cron.

## Deprecated Deno edge functions

`supabase/functions/process-waitlist-expiry`, `supabase/functions/generate-class-instances`,
and `supabase/functions/_shared` are superseded by the Next.js cron handlers
in `app/api/cron/*`. They should be deleted from the repo and un-deployed
from Supabase before the next release.
