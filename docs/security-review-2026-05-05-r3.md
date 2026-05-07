# Security Review — 2026-05-05 (round 3)

Re-review of `crossfit-app` on branch `fix/review-findings` after the round-2 fixes (commits `d6d1552` … `b4c23d6`). **No code changes were made.**

Bottom line: **two new Critical issues**. Round-3 surfaces a hardcoded production service-role key in committed git history, and an RLS policy narrowing that breaks two production code paths the moment migrations 022 + 019 are applied.

Severity scale: **Critical / High / Medium / Low / Info**

---

## Status of round-2 findings

| Prior | Title | Status |
|-------|---|---|
| C1 | CSP `unsafe-inline` + `unsafe-eval` | **Still open** (`proxy.ts:86`) |
| N1 | Drop-column migration vs code refs | Fixed — `confirmation_token` removed from all six call sites; migration 019 safe |
| N2 | `admin_audit_log` RLS | Fixed — migration 021 enables RLS + REVOKEs grants |
| N3 | `bookings` FOR ALL → narrowed | Migration 022 in place — **but breaks two flows; see R1 below** |
| N4 | Atomic signup saga | Partially — auth user is rolled back; orphan gym row is not (R3 below) |
| N5 | Admin pages call `requireAdminAuth()` | Fixed — verified at all four admin pages |
| N6 | Spend-limit fail-open / NaN / service-role | Fixed — `lib/ai/spend-limit.ts` uses caller's client, fails closed, validates env |
| N7 | CSRF on confirm POST | Fixed — double-submit cookie at `app/api/bookings/confirm/[token]/route.ts:104,120-129` |
| N8 | `save_workout_draft` gym guard | Fixed — migration 023 adds `auth.role() != 'service_role'` gym check |
| N9 | Member-mutable `users.email` | Fixed — migration 023 locks `email` in WITH CHECK |
| N10 | Booking insert race | Fixed — migration 023 adds `insert_booking_atomic` RPC with FOR UPDATE row lock |
| N11 | `BOOKING_TOKEN_SECRET` not in local env | Not addressed (informational) |
| N12 | Invite hash readable | Not addressed (no third-party JS yet) |
| N18 | Headers on redirect responses | Not addressed |

---

# New findings

## Critical

### R1. Migration 022's narrowed bookings RLS breaks the confirm endpoint and member-side waitlist promotion
Files: `supabase/migrations/022_narrow_bookings_rls.sql`, `app/api/bookings/confirm/[token]/route.ts:196-203`, `app/api/bookings/route.ts:200-204` (DELETE branch), `lib/bookings/waitlist.ts:97-112`

The new `member cancels own bookings` UPDATE policy has

```sql
WITH CHECK (
  user_id = auth.uid()
  AND gym_id = current_gym_id()
  AND status = 'cancelled'
  AND attended = false
)
```

— so a member's user-scoped client can only flip an active booking to `cancelled`. Two existing flows still issue UPDATEs that are *not* a flip-to-cancel and now use the user-scoped client:

**(a) Confirmation success path — `app/api/bookings/confirm/[token]/route.ts:117, 195-203`.** The route opens `await createClient()` (cookie-bound) then runs `.update({ status: 'confirmed', … })`. Post-update status is `confirmed`, the WITH CHECK requires `cancelled`, RLS rejects the UPDATE → `confirmRows.length === 0` → the route always returns `?error=invalid-token`. Every wait-list promotion email becomes an unconfirmable dead link. The same client also issues the expire-cancel and class-filled-cancel updates — those flip to `cancelled` and survive the policy, so the *failure* paths still work; only the *success* path is broken.

**(b) Member-side waitlist promotion — `lib/bookings/waitlist.ts:97-112`.** When a member calls `DELETE /api/bookings`, the route invokes `promoteNextWaitlistMember(supabase, …)` with the cancelling member's user-scoped client. Inside, `db.from('bookings').update({ status: 'pending_confirmation', … })` targets *another member's* row. The current member's client can neither SELECT (`member sees own bookings` filters by `user_id = auth.uid()`) nor UPDATE that row (USING clause requires `user_id = auth.uid()`). The promotion silently no-ops. The cron `app/api/cron/waitlist-expire/route.ts` uses the admin client, so cron-driven promotions still work — but every member-cancel-frees-a-seat case stops promoting.

**Exploit / impact:**
- A waitlisted member never gets the spot when the person ahead cancels. The seat sits empty until the cron sweeps an expired pending_confirmation (which won't happen because nothing got promoted).
- Every confirm-link click after migration 022 lands you on `/my-schedule?error=invalid-token`. Pending bookings rot until they expire and the cron cancels them — at which point cron tries to promote, succeeds (admin client), the next person clicks, also fails. The waitlist queue effectively halts behind the broken confirm.

**Fix plan**
1. **Confirm POST:** switch to `createAdminClient()` for the `status: 'confirmed' …` UPDATE (and the two cancel UPDATEs for symmetry). The token has already been HMAC-verified + CSRF-cookie-checked; service-role is appropriate. Mirror exactly what `bookings/route.ts` did when it moved to `insert_booking_atomic`.
2. **`promoteNextWaitlistMember`:** drop the `supabase: unknown` parameter (or document that it must be admin). The function manipulates other members' rows by design; pass `createAdminClient()` from every call site, including `app/api/bookings/route.ts:200-204` and `app/api/bookings/confirm/[token]/route.ts:170`.
3. Add a vitest that mocks the supabase update to return `rows.length === 0` and asserts the route still responds correctly — that would have caught (a).
4. End-to-end test: cancel-then-watch-promotion in a member↔member scenario.

This is one half-day fix and should ship before migration 022 reaches prod, or together with it.

### R2. Hardcoded production Supabase service-role key in committed git history
File: `scripts/migrate-009.mjs:3` (committed in `58dc9f3`, April 8 2026)

```js
const SUPABASE_URL = 'https://ncpxagtwgaxgbuxmuvmu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJ…REDACTED—key-rotated'
```

The JWT decodes to `role: service_role`, project `ncpxagtwgaxgbuxmuvmu`, with `exp = 2089872755` — valid until **22 February 2036**. This is the production Supabase service-role key. Anyone with read access to the repository (current contributors, anyone who has ever cloned, GitHub if the repo is public, anyone reading the Vercel git mirror) holds full bypass-RLS read/write to the production database for the next ten years. Every fix from rounds 1 and 2 — RLS narrowing, admin gating, audit log lockdown, IDOR closures, signup hardening — is irrelevant against this key.

**Exploit:** clone the repo or pull the file, then
```bash
curl https://ncpxagtwgaxgbuxmuvmu.supabase.co/rest/v1/users \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```
Returns every user, every gym, every booking. Same key works for INSERT/UPDATE/DELETE, dropping tables via the SQL endpoint, etc.

**Fix plan (do today, in order):**
1. **Rotate the service-role key now.** Supabase dashboard → Project Settings → API → "Reset service_role secret". This invalidates the leaked JWT immediately.
2. Update the new key in Vercel env (`SUPABASE_SERVICE_ROLE_KEY`) and redeploy.
3. Delete `scripts/migrate-009.mjs` from the working tree (it's a one-shot 009-migration script no longer needed).
4. Optionally rewrite git history to scrub the leaked value (`git filter-repo --path scripts/migrate-009.mjs --invert-paths`). If the repo is public, even after deletion the value is in commit `58dc9f3` until history is rewritten *and* every fork updated.
5. Add a `gitleaks` / `trufflehog` pre-commit hook to catch this class of mistake. See https://github.com/gitleaks/gitleaks.
6. Audit Supabase logs for usage of the old key from unexpected IPs in the period since April 8 — if anyone else used it, they touched real data.

This finding alone outranks every previous Critical. It must be the first action taken.

---

## High

### R3. Atomic-signup rollback covers the auth user but leaves orphan gym rows
File: `app/api/auth/signup/route.ts:67-95`

The N4 fix added `rollbackAuthUser()` on `gymError` and `userError`, but consider the failure mode:

- `gyms.insert` succeeds (gym row created with `owner_id = NULL`)
- `users.insert` fails (e.g. constraint violation, race)
- code calls `rollbackAuthUser()` → auth.users row deleted ✓
- the gym row remains with `owner_id = NULL`

The orphan gym is now permanently in the table. It's invisible to any UI (no owner to log in as), but counts toward billing/storage and clutters admin queries. Worse, if the email is reused for a fresh signup, a *new* gym row is created — the orphan is never collected.

A second, subtler case: the trailing `await supabase.from('gyms').update({ owner_id: userId }).eq('id', gym.id)` (line 95) is awaited but its return is ignored. If it fails (transient DB hiccup), the gym has no owner — admin lookups via `gym.owner_id → users` break. The auth user + users row exist, so the owner can still log in, but `requireOwnerAuth` queries `users` (which works), so functionally the owner is fine. The breakage is in the admin overview and any feature that joins `gyms.owner_id`.

**Fix plan**
1. Wrap the entire signup in a Postgres function `signup_gym(p_user_id, p_email, p_gym_name, p_timezone, p_gym_type) → jsonb` that does INSERT gym + INSERT user + UPDATE gym.owner_id atomically. Call after `auth.admin.createUser`. On failure, rollback the auth user.
2. Or: track the just-created gym id and call `await supabase.from('gyms').delete().eq('id', gym.id)` from `rollbackAuthUser()` when reaching the users.insert failure branch.
3. Check the return of the final `update({ owner_id })` and roll back gym + auth user if it errors.
4. Add a sweeper cron that deletes gyms where `owner_id IS NULL AND created_at < now() - interval '1 hour'`.

### R4. `insert_booking_atomic` trusts caller-supplied parameters — defence-in-depth gap (mirror of N8 not applied)
File: `supabase/migrations/023_db_correctness.sql` (the `insert_booking_atomic` function, lines ~70-130)

The N8 fix added a `IF auth.role() != 'service_role' THEN … check gym ownership` to `save_workout_draft`. The new `insert_booking_atomic`, written in the same migration, **does not have the equivalent guard**:

```sql
CREATE OR REPLACE FUNCTION insert_booking_atomic(
  p_gym_id            uuid,
  p_instance_id       uuid,
  p_user_id           uuid,
  p_capacity          int,
  p_waitlist_enabled  boolean,
  …
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
```

Today this is safe because `GRANT EXECUTE … TO service_role` only — `authenticated` cannot call it. But:

1. **No `auth.role()` gate** — a future re-grant to authenticated (the same kind of mistake migration 010 originally made and 015 had to fix) lets any logged-in member call:
   ```js
   supabase.rpc('insert_booking_atomic', {
     p_gym_id: someoneElsesGym, p_instance_id: someoneElsesInstance,
     p_user_id: theirOwnId, p_capacity: 999999, …
   })
   ```
   and book themselves into another gym's class with a fake capacity.

2. **`p_capacity` is caller-supplied** — even now (service-role only) this is the wrong design. The function should `SELECT capacity FROM class_instances WHERE id = p_instance_id INTO v_capacity` after the FOR UPDATE lock, and ignore the parameter. A buggy/malicious caller passing `p_capacity = 999999` neutralises the cap check.

3. **`p_instance_id` and `p_gym_id` are not cross-checked.** If a caller passes an instance from gym A and a gym_id of gym B, the booking is created with `gym_id = B` for an instance in gym A. Currently the route filters `class_instances` by `gym_id` before calling, so this can't happen — but the function should defend itself.

4. **Re-book path (`p_existing_id IS NOT NULL`)** matches on `id = p_existing_id AND user_id = p_user_id` but does not assert `gym_id = p_gym_id`. A re-book row from a previous gym (only possible if data is migrated, but) could be UPDATEd with a fresh `instance_id` while still pointing at the old `gym_id`. The UPDATE statement does not change `gym_id`, so the booking is now inconsistent with its instance.

**Fix plan**
1. Add the same defence as `save_workout_draft`:
   ```sql
   IF auth.role() != 'service_role' THEN
     IF p_user_id != auth.uid() THEN
       RAISE EXCEPTION 'insert_booking_atomic: user_id mismatch';
     END IF;
     IF p_gym_id != (SELECT gym_id FROM users WHERE id = auth.uid()) THEN
       RAISE EXCEPTION 'insert_booking_atomic: gym_id mismatch';
     END IF;
   END IF;
   ```
2. Drop `p_capacity` from the signature; read capacity inside the locked SELECT:
   ```sql
   SELECT capacity INTO v_capacity FROM class_instances
     WHERE id = p_instance_id AND gym_id = p_gym_id FOR UPDATE;
   IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
   ```
3. Update the route to drop the `p_capacity` argument.

---

## Medium

### R5. CSRF cookie path is broader than needed; fixed name re-used across windows
File: `app/api/bookings/confirm/[token]/route.ts:104`

```ts
'Set-Cookie': `_csrf=${csrf}; HttpOnly; SameSite=Strict; Path=/api/bookings/confirm; Max-Age=900`
```

Two minor issues:

1. **Path scope.** `Path=/api/bookings/confirm` covers every confirmation token route; a member with two pending confirmations (rare but possible) opens both interstitials, the second sets a new `_csrf` cookie at the same path, overwriting the first. Submitting the first form fails CSRF check. UX bug, not a security one, but creates confusing failures.
2. **Cookie name `_csrf` is generic.** If anything else on the same origin sets `_csrf` for any other purpose, the values clash. Pin it to e.g. `_kova_confirm_csrf` and scope path to `/api/bookings/confirm/${verified.bookingId}` (which would also fix issue 1 — each booking has its own cookie path).

### R6. Confirm POST CSRF check is plain string equality (timing-safe not needed but worth noting)
File: `app/api/bookings/confirm/[token]/route.ts:127`

```ts
if (!cookieCsrf || !formCsrf || cookieCsrf !== formCsrf) { … }
```

The CSRF token is already a 16-byte random hex string; brute-forcing in a timing-leak window is implausible. Including for completeness — use `crypto.timingSafeEqual` if you ever audit this for compliance.

### R7. `lib/ai/spend-limit.ts` increment race still exists (acknowledged) but now also fail-closes on a transient miss
File: `lib/ai/spend-limit.ts:43-46`

The N6 fix made the function fail closed when the gym row is missing — good. But "fail closed" here means a transient Supabase 5xx that returns `{ data: null }` blocks AI calls for the entire gym. If the gym row exists but is briefly unavailable (Supabase pooling hiccup), every AI endpoint returns 429 until recovery. The previous behaviour silently allowed; the new behaviour silently blocks. Both are wrong — the right answer is to differentiate "row not found" from "query errored" and treat them differently.

**Fix:** capture `error` from the Supabase response. If `error` is set, log and **allow** (transient failures shouldn't block). If `data` is null with no error (truly missing row), fail closed.

```ts
const { data, error } = await supabase.from('gyms')…
if (error) { console.error('[spend-limit] read error', error); return { limited: false } }
if (!data) { console.error('[spend-limit] gym row not found', gymId); return { limited: true } }
```

### R8. `tests/lib/admin-auth.test.ts` duplicates parsing logic, doesn't test the real function
File: `tests/lib/admin-auth.test.ts:4-12`

The test inlines its own copy of `parseAdminEmails` / `isAdminEmail` rather than importing from `lib/auth-helpers.ts`. The real implementation now lowercases (round-2 H4 fix); the test does not, so the test would still pass even if the real code regressed and dropped `.toLowerCase()`. Test gives false confidence.

**Fix:** export the helper from `lib/auth-helpers.ts` (or keep the closure private but expose a thin pure helper) and import it in the test.

### R9. `tests/api/bookings.test.ts` mirrors route logic instead of running it
File: `tests/api/bookings.test.ts:5-16`

The test re-implements `isBookingWindowOpen` and `canCancel` inline. It does not exercise the actual route handler, the new RPC, or RLS. None of these tests would have caught R1.

**Fix:** add a Supabase test harness (Postgres container, run the migrations, seed two users in two gyms, exercise routes via `fetch(handler)`). Even a single integration test for "member B cancels, member A is promoted" would have flagged R1 immediately.

---

## Low / Info

### R10. CSP still wide open (the standing C1 item)
`proxy.ts:84-91` unchanged. Recommend the report-only-mode rollout described in round-1.

### R11. `Set-Cookie: _csrf` lacks `Secure` flag
File: `app/api/bookings/confirm/[token]/route.ts:104`

The cookie is `HttpOnly; SameSite=Strict` but has no `Secure`. On HTTP this would leak; on HTTPS-only deployments it's moot. Belt-and-braces: add `Secure;` so it's enforced regardless of where the app runs.

### R12. `Path=/api/bookings/confirm` doesn't include trailing slash
Combined with R5: ensure the cookie applies as intended. Test by hitting `/api/bookings/confirm/<token>` (which it does) — fine, but if Next ever changes routing to redirect to `/api/bookings/confirm/<token>/` the cookie won't be sent. Defensive nit.

### R13. `incrementAiCalls` fire-and-forget chains use `.catch(...)` returning void
Files: `app/api/style/route.ts:67`, `app/api/style/generate-samples/route.ts:56`, etc.

If the increment fails, the AI call already happened but the gym's quota isn't decremented. Aggregate impact: small budget hole. Fine for now, flagged again for completeness — same as last round's N16.

### R14. `BOOKING_TOKEN_SECRET` and `AI_MONTHLY_LIMIT` undocumented
Same as N11 / N19 from round 2. Add a `.env.example`.

---

## Recommended remediation order

1. **R2 — rotate the leaked Supabase service-role key.** This is the single most urgent action. Everything else can wait an hour; this can't.
2. **R1 — fix the broken confirm/promotion paths** before deploying migration 022. Block the deploy until done.
3. **R3 — close the gym-row orphan loop.**
4. **R4 — harden `insert_booking_atomic`.**
5. **C1 — CSP nonces.**
6. **R5–R9** as bandwidth allows.

No code was modified during this review.
