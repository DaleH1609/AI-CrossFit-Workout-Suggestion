# Token Rotation Runbook

Describes how to rotate each secret the app depends on, the expected disruption
window, and which downstream systems need updating.

---

## BOOKING_TOKEN_SECRET

**What it does:** Signs/verifies the HMAC tokens in booking confirmation emails.
A valid token allows a member to confirm their waitlisted spot.

**Disruption when rotated:** Any pending-confirmation email sent *before*
rotation will contain a token signed with the old secret. After rotation those
tokens verify as invalid. Members who click an old confirmation link will see
"Invalid or expired token" and their booking will stay `pending_confirmation`
until the `waitlist-expire` cron sweeps it (runs hourly, expires tokens after
~2 hours). The booking is then cancelled and the next waitlisted member is
promoted.

**How to rotate:**
1. Schedule the rotation for a low-traffic window (typically 23:00–01:00 local).
2. Generate a new secret: `openssl rand -hex 32`
3. Update in Vercel: Settings → Environment Variables → `BOOKING_TOKEN_SECRET` →
   set to new value for Production (and Preview if applicable).
4. Trigger a new Vercel deployment to pick up the change.
5. Monitor the `waitlist-expire` cron logs for the next 2 hours to confirm
   expired pending bookings are swept cleanly.

---

## CRON_SECRET

**What it does:** Authenticates Vercel cron requests to `/api/cron/*`. Routes
check `Authorization: Bearer <CRON_SECRET>`.

**Disruption when rotated:** Cron jobs fail with 401 until the new value is
deployed. Disruption window = time between secret update and redeployment
(typically < 5 minutes with Vercel instant deploy).

**How to rotate:**
1. Generate: `openssl rand -hex 32`
2. Update `CRON_SECRET` in Vercel env → redeploy immediately.
3. Verify: check Vercel cron logs for the next scheduled run of both
   `generate-instances` and `waitlist-expire` to confirm 200 responses.

---

## SUPABASE_SERVICE_ROLE_KEY

**What it does:** Bypasses RLS for all admin-client operations (booking
atomics, member management, audit log writes, etc.).

**Disruption when rotated:** All server-side operations using `createAdminClient()`
fail until the new key is deployed. This is effectively a full outage of
write operations. Rotate only during planned maintenance.

**How to rotate:**
1. Announce maintenance window to active users.
2. Supabase dashboard → Project Settings → API → Reset `service_role` secret.
3. Copy the new JWT.
4. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel env → redeploy immediately.
5. Verify by checking the Vercel function logs for any `401` or `403` from
   Supabase (should be zero after deploy).
6. If the old key was ever exposed in git history, run:
   ```
   git filter-repo --path scripts/migrate-009.mjs --invert-paths
   git push --force-with-lease
   ```
   Update every fork/clone. See the round-4 security review (K1).

---

## RESEND_API_KEY

**What it does:** Authenticates outbound email sends (booking confirmations,
invites, waitlist notifications).

**Disruption when rotated:** Email sends fail until redeployed. Members do not
receive confirmation or cancellation emails during the gap. Bookings and
cancellations still process correctly — only the email notification is missing.

**How to rotate:**
1. Resend dashboard → API Keys → Create new key with the same permissions.
2. Update `RESEND_API_KEY` in Vercel env → redeploy.
3. Revoke the old key in the Resend dashboard.
4. Send a test booking confirmation to verify.

---

## ANTHROPIC_API_KEY

**What it does:** Authenticates AI workout generation and style-profile calls.

**Disruption when rotated:** AI generation returns 401 until redeployed.
The UI shows "Generation failed" but all other app functions work normally.

**How to rotate:**
1. Anthropic Console → API Keys → Create new key.
2. Update `ANTHROPIC_API_KEY` in Vercel env → redeploy.
3. Revoke the old key in the Anthropic Console.
4. Trigger a test workout generation to verify.

---

## UPSTASH_REDIS_REST_TOKEN / UPSTASH_REDIS_REST_URL

**What it does:** Used by `@upstash/ratelimit` to enforce the AI rate limit
(10 req/min per gym) and by push-subscription storage.

**Disruption when rotated:** AI rate limiting fails open (allows all requests)
until redeployed, since `checkAiLimit()` logs and allows on transient errors.
Push subscriptions are unaffected (they're stored in Supabase, not Redis).

**How to rotate:**
1. Upstash console → Database → Reset token.
2. Update `UPSTASH_REDIS_REST_TOKEN` (and URL if changed) in Vercel env → redeploy.
3. Verify: trigger an AI call and check the Upstash request logs.

---

## VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY

**What it does:** Signs Web Push notifications sent to subscribed members.

**Disruption when rotated:** All existing push subscriptions become invalid —
the browser rejects pushes signed with a different VAPID key pair. Members
stop receiving push notifications until they re-subscribe.

**How to rotate:**
1. Generate new keys: `npx web-push generate-vapid-keys`
2. Update both vars in Vercel env → redeploy.
3. Existing subscriptions in `push_subscriptions` will start failing silently.
   A background sweep (or the next push send failure) can prune them.
4. Members must visit Settings → Notifications and re-subscribe.
   Consider showing an in-app banner prompting re-subscription.

---

## Notes

- Always rotate one secret at a time and verify before rotating the next.
- Vercel's "Instant Rollback" can undo a bad deployment in < 60 seconds if a
  rotation causes unexpected breakage.
- After any rotation, update `.env.example` if the variable format changed.
