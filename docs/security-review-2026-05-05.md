# Security Review — 2026-05-05 (round 2)

Re-review of `crossfit-app` on branch `fix/review-findings`. The previous review (2026-05-04) had 26 findings; the work since (commits `d052d20`, `83d2950`, `a45a18e`, `948e261`, `ab4fd29`, plus uncommitted edits) addressed all but C1 (CSP). This round looks for **new issues introduced by the fixes** and anything the first pass missed. **No code changes were made.**

Severity scale: **Critical / High / Medium / Low / Info**

---

## Status of prior findings

| Prior | Title | Status |
|-------|---|---|
| C1 | CSP `unsafe-inline` + `unsafe-eval` | **Still open** (proxy.ts:86) |
| C2 | IP rate-limit spoofing | Fixed — `app/api/auth/signup/route.ts:8-10` uses `x-real-ip` then rightmost `x-forwarded-for` |
| H1 | Rate limiter fail-open in prod | Fixed — `lib/rate-limit.ts:72-74` throws when `VERCEL_ENV === 'production'` |
| H2 | AI cost cap | Fixed — new `lib/ai/spend-limit.ts` + per-route gates (but see N4 below) |
| H3 | GET-mutation on confirm | Fixed — GET now returns HTML interstitial; POST mutates (but see N7 below) |
| H4 | Admin email case-sensitivity | Fixed — both `proxy.ts:36-37` and `lib/auth-helpers.ts:113-114` lowercase |
| H5 | Service-role overuse | Partially — admin client still used in many places; new `spend-limit.ts` adds another (N4) |
| H6 | Settings PATCH allow-list | Fixed — `app/api/settings/gym/route.ts:17-25` rejects unknown keys |
| M1 | Workout-day shape validation | Partially — added 50KB JSON size cap, but no shape validation (still trusts `updatedDay: object`) |
| M2 | Drop `confirmation_token` column | **Migration written (`019_drop_confirmation_token.sql`) — but code still writes to it. See N1.** |
| M3 | Reply-to header validation | Fixed — `lib/email/send.ts:40-44` rejects control chars + format |
| M4 | Cron timing-safe length leak | Fixed — `lib/api/cron-auth.ts:32-37` HMACs both inputs to fixed length |
| M5 | Email enumeration via invite | Fixed — `app/api/members/invite/route.ts:40-41` returns generic message |
| M6 | `existingByEmail` non-unique | Fixed — `app/api/members/invite/route.ts:33` adds `.limit(1)` |
| M7 | Members in suspended gym | Addressed — 7-day grace period |
| M8 | `style.raw_text` control-char strip | Fixed — `app/api/style/route.ts:40` strips control chars |
| M9 | Email verification on signup | Fixed — `email_confirm: true` removed (but creates orphan-row gap, see N5) |
| L1 | `.gitignore` `.env*` | Confirmed broadened in commit `83d2950` |
| L2 | URL allowlist guard | Not addressed (low priority) |
| L3 | gym name HTML strip | Fixed — `app/api/auth/signup/route.ts:30-31` strips `<>` and control chars |
| L4 | `show_member_names` | Not changed (informational only) |
| L5 | HSTS | Fixed — `proxy.ts:97` |
| L6 | Duplicate `UUID_RE` | Not consolidated (low priority) |
| L7 | eslint-config-next mismatch | Not changed |
| L8 | PII in logs | Not changed |
| L9 | Permissions/Referrer/X-Content-Type-Options | Fixed — `proxy.ts:94-96` |
| L10 | Explicit CORS deny | Not changed (default deny is fine for now) |

---

# New findings

## Critical

### N1. Migration `019_drop_confirmation_token.sql` will break the booking flow when applied
File: `supabase/migrations/019_drop_confirmation_token.sql` (untracked, staged)
Code still writes to the column at six call sites:
- `lib/bookings/waitlist.ts:101` — `confirmation_token: token` on every promotion
- `app/api/bookings/confirm/[token]/route.ts:135, 164, 177` — three null-assignments on cancel/confirm
- `app/api/bookings/route.ts:117` — re-book path zeros it
- `app/api/cron/waitlist-expire/route.ts:70` — cron expiry zeros it

Once migration 019 lands, every `INSERT/UPDATE` referencing `confirmation_token` will fail with `column "confirmation_token" of relation "bookings" does not exist`. Concretely:
- **Waitlist promotions stop working** — the very first time a class fills up post-deploy, `promoteNextWaitlistMember` errors out. No member is promoted; the spot stays unfilled.
- **Confirm/expire flow errors** — every confirmation expiry, every "class filled" auto-cancel, every confirm-then-clear-token UPDATE fails. Bookings stuck in `pending_confirmation` indefinitely.
- **Re-booking after cancel breaks** — `app/api/bookings/route.ts:117` is the path used when a member books a class they previously cancelled.

This is the single highest-impact finding in this round — it's a production-breaking bug masquerading as a defence-in-depth cleanup. The migration is **untracked** in git so it can be deferred safely, but it's clearly intended to be committed. It must not be deployed until the code references are removed.

**Fix plan**
1. Remove every `confirmation_token: ...` from INSERT/UPDATE payloads above.
2. Remove `confirmation_token` from the SELECT in `lib/bookings/waitlist.ts` (currently selects it implicitly via `*` somewhere? — verify).
3. Update the `BookingRow` interface in `app/api/bookings/confirm/[token]/route.ts` accordingly (already done in working tree — line 15 no longer lists it).
4. Only then commit migration 019.
5. Add a CI check that `grep -r 'confirmation_token' app/ lib/` returns no matches when migration 019 is in place — or wrap it in a dependency comment block.

---

## High

### N2. `admin_audit_log` has no RLS — any authenticated user can read, insert, or delete entries
File: `supabase/migrations/018_admin.sql:5-13`

```sql
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target_id uuid,
  target_name text,
  created_at timestamptz not null default now()
);
```

No `ALTER TABLE … ENABLE ROW LEVEL SECURITY`. By default Supabase grants `SELECT, INSERT, UPDATE, DELETE` to the `authenticated` role on new tables. So:

- **Any logged-in member or owner** can `SELECT * FROM admin_audit_log` via the Supabase REST API and read the entire admin action history (which gyms have been suspended, by whom, when).
- They can `INSERT` forged entries to frame an admin: `INSERT INTO admin_audit_log VALUES (..., 'admin@example.com', 'delete_gym', '<victim-gym>', ...)`.
- They can `DELETE FROM admin_audit_log` to wipe the trail of an actual admin action — the very purpose of the audit log is defeated.

**Exploit sketch:** member opens devtools → finds Supabase URL + anon key (already in `NEXT_PUBLIC_*`) → uses their access token from the auth cookie → `fetch('https://<sb>.supabase.co/rest/v1/admin_audit_log', { method: 'DELETE', ... })`. Done in 30 seconds.

**Fix plan**
1. Add to migration 018 (or a new follow-up):
   ```sql
   ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
   -- No SELECT/INSERT/UPDATE/DELETE policies = all denied for authenticated.
   -- Service-role bypasses RLS, so the existing app/(admin)/gyms/[gymId]/actions.ts inserts continue to work.
   ```
2. Optionally add a `SELECT` policy gated on `auth.email() IN (admins)` if you want admins to read the log via the user-scoped client; otherwise keep the admin pages going through `createAdminClient()`.
3. Also `REVOKE ALL ON admin_audit_log FROM authenticated, anon` for belt-and-braces.

### N3. `bookings` member RLS allows mass-assignment to `attended`, `status`, `waitlist_position`, etc.
File: `supabase/migrations/002_rls.sql:71-74`

```sql
create policy "member manages own bookings" on bookings
  for all using (user_id = auth.uid() and gym_id = current_gym_id())
  with check (user_id = auth.uid() and gym_id = current_gym_id());
```

`FOR ALL` covers UPDATE with no column-level restriction. RLS in Postgres does not do column-level checks (those need `GRANT (col1, col2) ...` or a trigger). A member can hit Supabase REST directly and PATCH **any column** on their own booking row:

- `attended = true` → fakes attendance for streak/loyalty programs (none today, but the data is used by `members/attendance` reports for the owner).
- `status = 'confirmed'` while it's actually `cancelled` after the cutoff → walks past `cancellation_cutoff_hours`.
- `status = 'waitlisted' → 'confirmed'` → jumps the queue without going through `pending_confirmation`.
- `waitlist_position = 1` → puts themselves at the front of the waitlist.
- `confirmation_expires_at = '2099-01-01'` → keeps a pending_confirmation alive forever (until N1's migration also drops this column? — it doesn't, only `confirmation_token` is dropped).

Today the route handlers gate these transitions, but the routes are not the only path: any authenticated member can call Supabase REST with their session token and bypass the route entirely.

**Exploit sketch:**
```js
const token = document.cookie.match(/sb-access-token=([^;]+)/)[1]
fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${myBookingId}`, {
  method: 'PATCH',
  headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ attended: true, status: 'confirmed' })
})
```

**Fix plan**
1. Replace `FOR ALL` with separate, narrow policies:
   - `SELECT`: keep as-is.
   - `INSERT`: `WITH CHECK (user_id = auth.uid() AND gym_id = current_gym_id() AND status IN ('confirmed','waitlisted','pending_confirmation') AND attended = false AND waitlist_position IS NULL)` — or just disallow direct INSERT and route everything through the API.
   - `UPDATE`: only allow flipping `status` from `confirmed`/`waitlisted`/`pending_confirmation` → `cancelled` (member cancellation) and nothing else. Use a `WITH CHECK` that compares `OLD.attended = NEW.attended`, etc.
2. Or — simpler — `REVOKE INSERT, UPDATE, DELETE ON bookings FROM authenticated`, drop the FOR-ALL policy, and force every mutation through the route handlers (which use the service-role client where needed). Members keep the `SELECT` policy.
3. Add a column-level constraint trigger that raises if `attended` changes outside of an owner-scoped path.

### N4. Signup is no longer atomic — orphan Auth users / orphan gyms on partial failure
File: `app/api/auth/signup/route.ts:55-78`

```ts
const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, password })
…
const { data: gym, error: gymError } = await supabase.from('gyms').insert(…)
if (gymError) return jsonServerError('auth/signup gyms.insert', gymError)
…
const { error: userError } = await supabase.from('users').insert(…)
if (userError) return jsonServerError('auth/signup users.insert', userError)

await supabase.from('gyms').update({ owner_id: userId }).eq('id', gym.id)
```

Now that `email_confirm: true` is removed (M9 fix), the Auth user is created in an *unconfirmed* state. If `gyms.insert` or `users.insert` then fails, the failure modes are:

1. **Auth user orphans without a gym row.** They never confirm, so they can't sign in — but the email is now permanently registered at Supabase Auth. If the same person retries signup, `createUser` fails ("email already registered") and they're *locked out* with no recovery (the email never arrived, password reset goes to a non-existent user).

2. **Auth user + gym row exist, but no `users` row.** They confirm and try to log in → `requireOwnerAuth` queries `users`, gets nothing, returns 401 → infinite redirect to /login. The gym row exists with `owner_id` left at `null` (step 4 never ran).

3. **Account squatting.** An attacker can fire `createUser` with a victim's email. Even though the request body is rate-limited (5/h per real IP after C2's fix), a single squat attempt is enough: the victim now can't sign up because their email is "already registered" at Supabase Auth, even though the squatter never confirmed.

The 015-05-04 review (M9) recommended this exact change but did not flag the consequence that signup needs to be wrapped in a saga.

**Fix plan**
1. Wrap the multi-step signup in a saga: on any post-Auth failure, delete the just-created Auth user via `supabase.auth.admin.deleteUser(userId)` to avoid orphans.
2. To address account squatting: only call `createUser` *after* the gym/user inserts succeed in a transactional Postgres function. Or invert the order — create the gym first with a placeholder owner, create Auth user last, and on Auth failure delete the gym.
3. Add a sweeper cron that deletes unconfirmed Auth users (and their orphan gym rows) older than 24 hours.
4. For the squatting case, return a generic "If this email isn't already registered, you'll receive a verification email" message regardless — don't reveal that creation failed.

---

## Medium

### N5. Admin pages don't call `requireAdminAuth()` — rely entirely on the layout
Files:
- `app/(admin)/page.tsx:69` — `getStats()` runs `createAdminClient()` reads with no in-page auth check
- `app/(admin)/users/page.tsx:5-72` — `searchUsers()` ditto
- `app/(admin)/gyms/page.tsx` — same pattern
- `app/(admin)/gyms/[gymId]/page.tsx:30-77` — `getGymDetail()` ditto

Auth is enforced once, in `app/(admin)/layout.tsx:7`. In the App Router, layouts and their children render concurrently; the layout's `requireAdminAuth()` redirect aborts the response before children stream to the client, so **today** the data isn't returned to a non-admin. But:
- The DB queries still execute against the service-role client every time anyone hits an `/admin/*` URL — a logged-in member could trigger admin-load DB cost just by visiting.
- A future refactor that moves the layout's auth into a `<ProtectedAdmin>` wrapper or removes the layout will silently expose every admin page.
- The `actions.ts` server actions correctly call `requireAdminAuth()` themselves; pages should mirror that.

**Fix plan**
1. Add `await requireAdminAuth()` at the top of every admin page's default export (and at the top of `getStats`/`searchUsers`/`getGymDetail` for early failure).
2. Add a comment in `lib/auth-helpers.ts` reminding callers that the admin client bypasses RLS so caller-side auth checks are mandatory.
3. Consider a thin `withAdminAuth(page)` wrapper that does the gate.

### N6. `lib/ai/spend-limit.ts` uses service-role unnecessarily; NaN parse fails open; race window
File: `lib/ai/spend-limit.ts`

Three issues, all medium:

1. **Service-role for what should be a user-scoped query** (`lib/ai/spend-limit.ts:21-26, 49-54`). The route handlers already verified the caller owns the gym before calling `checkAiLimit(gymId)`. Using `createAdminClient()` here just adds another place where a future code change could leak a wrong `gymId` past RLS. The user-scoped supabase client passed via `auth` works fine for read+update on the owner's own gym.

2. **`parseInt` of `AI_MONTHLY_LIMIT` returns NaN if env is malformed** (`lib/ai/spend-limit.ts:11`):
   ```ts
   const LIMIT = parseInt(process.env.AI_MONTHLY_LIMIT ?? '50', 10)
   ```
   If someone deploys with `AI_MONTHLY_LIMIT=fifty`, `LIMIT` is `NaN`, and `count >= NaN` is always `false`, so the cap silently never triggers. Same fail-open shape as the original H1 finding.

3. **Race condition** (acknowledged in the comment): `checkAiLimit` reads, route does AI call, `incrementAiCalls` reads again and writes. Two concurrent requests can both pass `checkAiLimit` with `count = LIMIT - 1`, both perform the AI call, then both increment to `LIMIT + 1`. Acceptable today (Anthropic rate limit is the harder ceiling), but should be a `RPC` with `UPDATE … RETURNING` for atomicity if the cap is ever load-bearing for cost control.

4. **Fail-open if gym row missing** (`lib/ai/spend-limit.ts:28`): `if (!data) return { limited: false }` masks bugs. An authenticated owner with no gym row is itself a sign of corruption; the route should refuse rather than allow unbounded AI calls.

**Fix plan**
1. Pass the user-scoped supabase client into `checkAiLimit`/`incrementAiCalls` instead of building a new admin client. (Or: gate behind a comment that explains why service-role is required, if there's a real reason.)
2. Validate the env var: `const LIMIT = Number.isFinite(+raw) && +raw > 0 ? +raw : 50`.
3. Convert to a single Postgres function `increment_ai_calls(gym_id, current_month) RETURNS new_count` that does the read-reset-or-increment atomically, and have the route check the returned count vs LIMIT.
4. Fail closed if gym row is missing.

### N7. Confirm-flow POST has no CSRF protection beyond URL secrecy
File: `app/api/bookings/confirm/[token]/route.ts:103-195`

The H3 fix correctly moved mutation from GET to POST + interstitial. But the form has no CSRF token / double-submit cookie:

```html
<form method="POST">
  <button type="submit">Confirm my spot →</button>
</form>
```

The token in the URL path is the *only* secret. Any tool that fetches the URL and follows the form submission (some aggressive email scanners, link-checking tools, sandboxed browsers in security products) will still confirm. The interstitial's GET is now safe (no mutation), but the *posted* form is still trivially auto-submittable by any HTML-aware bot that does `<form>` action-following.

**Fix plan**
1. Set a short-lived random cookie `_csrf=<random>` on the GET response, include `<input type="hidden" name="_csrf" value="<random>">` in the form, verify equality on POST.
2. Or require a same-origin `Sec-Fetch-Site: same-origin` header on POST and reject otherwise. Simpler, but not all browsers send it; treat as defence-in-depth, not authoritative.
3. Or require that the POST request come with a JS-set header (e.g. `X-Confirm: 1`) added by an inline script — but that needs the very CSP relaxation that C1 is supposed to remove. Bad pairing.

The double-submit cookie is the cleanest answer here.

### N8. `save_workout_draft` SECURITY DEFINER trusts caller-supplied `p_gym_id`
File: `supabase/migrations/010_upsert_workout_draft.sql:5-22`, re-defined in `011_fix_workout_week_constraints.sql`

```sql
CREATE OR REPLACE FUNCTION save_workout_draft(p_gym_id uuid, …) AS $$
  DELETE FROM workout_weeks WHERE gym_id = p_gym_id …
  INSERT INTO workout_weeks (gym_id, …) VALUES (p_gym_id, …)
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

`SECURITY DEFINER` runs as the function owner (typically `postgres`), bypassing RLS. The function takes `p_gym_id` as a parameter and trusts it.

Today this is safe because `015_security_hardening.sql` revokes `EXECUTE` from `authenticated`, so only `service_role` can call it — and the route handlers verified ownership before calling. But:

- **Defence-in-depth gap.** A future migration that re-grants `authenticated` (cf. the original 010 migration that did exactly this) reopens the cross-tenant write. Members would then be able to call `save_workout_draft('<another-gym-id>', '2026-01-05', '[evil JSONB]')` and overwrite a competing gym's drafts.
- **Service-role audit.** Any service-role caller that gets a wrong `gymId` (e.g. from a mis-typed JOIN) writes to the wrong gym with no SQL-side guardrail.

**Fix plan**
1. Add an in-function check:
   ```sql
   IF p_gym_id != current_gym_id() THEN
     RAISE EXCEPTION 'gym_id mismatch';
   END IF;
   ```
   But this won't work for service-role callers (no `auth.uid()`). Better:
2. Have the function infer `gym_id` from the calling user:
   ```sql
   IF auth.role() != 'service_role' THEN
     IF p_gym_id != (SELECT gym_id FROM users WHERE id = auth.uid()) THEN RAISE EXCEPTION …;
   END IF;
   ```
3. Or: drop `SECURITY DEFINER` if RLS would have allowed the operation anyway — invoker rights leave the safety to RLS.

### N9. Members can change `users.email` via RLS
File: `supabase/migrations/015_security_hardening.sql:14-21`

```sql
CREATE POLICY "member updates own profile" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM users WHERE id = auth.uid())
    AND gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
    AND revoked_at IS NOT DISTINCT FROM (SELECT revoked_at FROM users WHERE id = auth.uid())
  );
```

The hardening locks `role`, `gym_id`, and `revoked_at` — but `email` and `name` are still mutable. `email` is more sensitive than it looks:
- It's used as the lookup in `members/invite` (`existingByEmail`) — a member can rename their `users.email` to a victim's address to make their gym refuse inviting that victim.
- It's used as the recipient in `sendAccessRevoked`, `sendAccessRestored`, `sendBookingConfirmed`, etc. — a member can point those emails at someone else's inbox.
- `auth.users.email` (the actual login identity) lives elsewhere; `public.users.email` is just a denormalised copy. So the two can desync silently.

**Fix plan**
1. Add `AND email = (SELECT email FROM users WHERE id = auth.uid())` to the `WITH CHECK`.
2. If members need to update their email, do it through a route handler that updates both `auth.users` and `public.users` after a verification-link round-trip.

### N10. Booking POST-insert capacity check is racy under concurrency
File: `app/api/bookings/route.ts:128-141`

```ts
if (status === 'confirmed') {
  const { count: finalCount } = await supabase.from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('instance_id', instanceId)
    .in('status', ['confirmed', 'pending_confirmation'])
  if ((finalCount ?? 0) > instance.capacity) {
    await supabase.from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', booking.id)
    return jsonError('Class is full')
  }
}
```

The pattern is "count after insert, cancel if over". Two concurrent confirmed bookings into the last seat both pass `confirmedCount < capacity` and both insert. The post-check then runs concurrently for both: each query sees `finalCount = capacity + 1` and **both cancel themselves**. End state: a free seat with two cancelled rows. The seat is unbooked because both took the blame.

This is a correctness bug with a security flavor (DOS-by-coincidence: a determined attacker with two devices times two confirms to keep classes empty). Severity Medium because gym booking races aren't catastrophic, but it's a real foot-gun.

**Fix plan**
1. Move the booking insert into a Postgres function that does `SELECT ... FOR UPDATE` on the instance row, recounts, and inserts atomically. Reject inside the transaction.
2. Or: use the partial unique index on `bookings(instance_id, user_id) WHERE status IN (...)` to ensure only one *active* booking per user, plus a `confirmed_count <= capacity` exclusion constraint via `EXCLUDE` if you're feeling ambitious.

---

## Low / Info

### N11. `BOOKING_TOKEN_SECRET` not in local `.env.local`
Verified by inspection — the local env shows `ANTHROPIC_API_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_*`, `ADMIN_EMAILS`, but no `BOOKING_TOKEN_SECRET` or `AI_MONTHLY_LIMIT`. Local dev confirm/promotion flows will throw.

**Fix:** add to `.env.example` (recommended creating one) and document in `docs/setup.md`.

### N12. Invite page reads tokens from `window.location.hash` before stripping
File: `app/(auth)/invite/page.tsx:42-49`

The hash with `access_token` + `refresh_token` is on the URL until React's `useEffect` runs. Any third-party script loaded before that effect (analytics, error trackers, A/B tooling) can read it. None present today, but worth a comment to keep this footgun on the radar before adding any.

**Fix:** add `<noscript>` warning + strip the hash in a tiny inline `<script>` placed *above* any third-party tag in the document `<head>`. Alternatively: switch to PKCE flow which doesn't put tokens in fragments.

### N13. `app/(admin)/page.tsx` and others use `notFound()` / no UUID validation in some paths
File: `app/(admin)/gyms/[gymId]/page.tsx:31` — UUID check via `isUuid` is good; missing UUID returns null which renders an error page. Confirm the same pattern holds in any other dynamic admin routes.

**Fix:** standardize on a `requireUuid(param)` helper.

### N14. Member-name leak on attendance list (still)
File: `app/api/schedule/instances/route.ts:29-66` — Owner-side endpoint returns member names regardless of `show_member_names`. Same finding as L4 in the prior review, still applies. Re-flagging because it's explicitly opt-out-by-default; if a coach sub-role is ever added, this becomes a leak.

### N15. CSP is still wide open — repeating the standing item
File: `proxy.ts:84-91` (C1)

```ts
"script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
"style-src 'self' 'unsafe-inline'",
```

This is the **only** open finding from the prior review and remains the highest-impact unfixed item. The compensating controls (no `dangerouslySetInnerHTML` anywhere, no third-party JS, AI output rendered as text) all currently hold — but every commit risks introducing a new sink. Recommend the report-only-mode rollout described in the prior doc as a top priority.

### N16. `incrementAiCalls(gymId).catch(...)` is fire-and-forget across multiple routes
Files: `app/api/style/route.ts:67`, `app/api/style/generate-samples/route.ts:56`, `app/api/workouts/[weekId]/day/route.ts:60`, `app/api/workouts/generate/route.ts:71`, `app/api/workouts/movement-analysis/route.ts:33`

If the increment fails (Postgres hiccup), the AI call already happened and the gym used a quota slot but isn't charged for it. Each transient failure is a tiny budget hole. Aggregate impact is negligible; flagged for completeness.

**Fix:** await the increment before returning, and log+alert on failure.

### N17. `parseInt` in `lib/ai/spend-limit.ts` (covered above in N6.2) — listed separately for issue tracking.

### N18. No CSP/headers on redirect responses
File: `proxy.ts:10, 38, 54` — early-return `NextResponse.redirect(...)` calls do not inherit the headers added later. Browsers don't execute scripts on 302s, but an attacker who can MITM HTTP would not see HSTS on the redirect — first-connect downgrade attack risk on bare-domain redirects.

**Fix:** wrap header-setting in a helper and call before every return path; or set the headers earlier.

### N19. `AI_MONTHLY_LIMIT` default of 50 is undocumented
File: `lib/ai/spend-limit.ts:11`

There's no operator-facing doc for this var. A gym that hits 50 calls/month suddenly gets 429s with a generic message. Surface this to the gym admin somewhere visible (settings page, "47/50 calls used this month") so the surprise isn't punitive.

---

## Recommended order

1. **N1 — pre-empt the breaking migration.** Do not commit `019_drop_confirmation_token.sql` until all 6 code references are removed. This is one focused PR.
2. **N2 — RLS on `admin_audit_log`.** One migration line. ~15 minutes.
3. **N3 — narrow the bookings RLS.** Replace `FOR ALL` with column-aware UPDATE policy. Half-day including testing.
4. **N4 — atomic signup saga.** ~1 hour.
5. **N5 — admin auth in pages.** ~30 min, low risk, high defence-in-depth payoff.
6. **C1 — CSP nonces.** Half-day; report-only mode first.
7. **N6 — fix `spend-limit.ts`.** ~1 hour.
8. **N7 — CSRF on confirm POST.** ~1 hour.
9. **N8, N9, N10** — bundle into one DB-correctness PR.
10. Remaining Lows as bandwidth allows.

No code was modified during this review.
