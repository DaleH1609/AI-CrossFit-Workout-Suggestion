# Improvement Plan — 2026-05-06

Suggestions for `crossfit-app` beyond security. Drawn from the four-round security review (rounds 1-4 closed everything except K1's external rotation step) plus general observations of the codebase, schema, and product surface.

Each item is tagged:
- **Quick win** — under a day, low risk, do soon
- **Project** — 1-2 weeks of focused work
- **Strategic** — a quarter or more; plan for it

Severity by impact: **Critical / Important / Nice-to-have**

---

## Testing & quality

### T1. Stand up a Postgres-backed integration test harness — **Project / Important**
Files: `tests/api/bookings.test.ts:5-16`, all of `tests/`

Round 3's R1 was a four-line RLS migration that broke two production flows. Zero tests caught it because every test file inlines a copy of the route logic instead of running the real handler against a real database. The R9 finding was acknowledged with a comment — promote it to a real PR.

Stack: `vitest` + `@supabase/supabase-js` + Testcontainers Postgres + a `setup.ts` that runs every migration in order. Then write tests like:
```ts
test('cancelling a confirmed booking promotes the next waitlisted member', async () => {
  await seedTwoMembers()
  await book(memberA, classX); await book(memberB, classX) // B waitlisted
  await cancel(memberA, bookingA)
  expect(await statusOf(memberB)).toBe('pending_confirmation')
})
```

This single test would have caught R1 in CI before it shipped. ROI is enormous; this is the highest-leverage technical change you can make.

### T2. Replace the custom `z` validator with real Zod — **Quick win / Nice-to-have**
File: `lib/validation/z.ts` (the comment says "we needed runtime validation but couldn't pull in zod because external registry not available")

Zod is now bundled by Next.js's compiler — no registry needed at runtime. The custom shim is missing:
- Discriminated unions (you have `gymType: 'crossfit' | 'hyrox'` — one schema per variant)
- `.refine()` for cross-field rules (e.g., "weekStart must be a Monday" is hand-rolled in `app/api/workouts/generate/route.ts:32-34`)
- `.transform()` (lowercasing emails, trimming, normalising)
- Discriminated error messages

Migration: `npm install zod`, replace `lib/validation/z.ts` with re-exports of `zod`'s analogues, update call sites incrementally. The existing route signatures barely change because the API surface is similar.

### T3. Drop the `as unknown as` casts; let Supabase generate types — **Quick win / Important**
Files: ~40 occurrences across routes — e.g., `app/api/bookings/route.ts:46`, `app/api/settings/gym/route.ts:50` (multiple casts), `lib/bookings/waitlist.ts:38-50`

The pattern `const gym = gymRaw as unknown as GymSettings | null` papers over the fact that `lib/supabase/types.ts` is hand-maintained and out of sync with the schema. When migration 023 added `ai_calls_this_month` and `ai_month`, the types file wasn't updated; reads still work because of the `as unknown as` escape hatch.

Run `supabase gen types typescript --local > lib/supabase/types.ts` from your migration source of truth, wire it into `npm run gen:types`, run it on every migration. Then most `as` casts disappear.

### T4. `BOOKING_ADVANCE_DAYS` is dead code that the tests still depend on — **Quick win / Important**
Files: `lib/utils.ts:24`, `tests/api/bookings.test.ts:3-13`

```ts
// lib/utils.ts
export const BOOKING_ADVANCE_DAYS = 2

// app/api/bookings/route.ts:50 — actually used in production
const bookingAdvanceHours: number = gym?.booking_advance_hours ?? 0
```

Production reads `gym.booking_advance_hours` (per-gym setting) but the test file imports `BOOKING_ADVANCE_DAYS` and asserts hard-coded behaviour. The constant is not referenced in any route. Tests pass while testing fiction.

Action: delete `BOOKING_ADVANCE_DAYS`, rewrite the relevant tests to use the per-gym setting, or fold this into T1.

### T5. Email templates are hand-built HTML strings — **Project / Important**
File: `lib/email/templates.ts`

Every template is a tagged template literal with manual `escapeHtml(...)` calls. One forgotten escape and you have stored XSS via a gym name or member name. The templates also can't be previewed without sending real email through Resend.

Move to `react-email`:
- Templates become React components
- Variables are auto-escaped (it's React)
- `react-email preview` gives you live-reloading template previews
- Easier to add brand-consistent styling

Rough effort: each template is ~10 lines today, the migration is mostly mechanical.

---

## Architecture & data

### A1. Booking state machine should be enforced in the database, not the route layer — **Project / Important**
Files: `app/api/bookings/route.ts`, `app/api/bookings/confirm/[token]/route.ts`, `app/api/bookings/[id]/attend/route.ts`, `lib/bookings/waitlist.ts`, `app/api/cron/waitlist-expire/route.ts`

The booking status moves between `confirmed | waitlisted | pending_confirmation | cancelled` across at least seven different files. Each transition has its own UPDATE statement and its own preconditions. R1 happened precisely because RLS narrowed the *transition* but the route was still doing the ad-hoc UPDATE.

Enforce transitions in Postgres:
```sql
CREATE OR REPLACE FUNCTION enforce_booking_transition() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'cancelled' AND NEW.status NOT IN ('cancelled', 'confirmed', 'waitlisted') THEN
    RAISE EXCEPTION 'invalid transition %→%', OLD.status, NEW.status;
  END IF;
  -- … other rules …
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_transition_check
  BEFORE UPDATE ON bookings FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_transition();
```

Then it doesn't matter which route or which client did the UPDATE — illegal transitions raise. Route handlers shrink. Tests get cheaper.

### A2. Promote ad-hoc UPDATEs to RPCs by use case — **Project / Important**
Files: ~12 inline `.update(...)` calls touching `bookings`

You already have `insert_booking_atomic` and `save_workout_draft`. Same logic should cover: `cancel_booking(booking_id)`, `confirm_booking(booking_id)`, `mark_attended(booking_id, attended)`, `expire_pending_confirmation(booking_id)`. Each RPC encodes the auth check, the transition, and the side-effects (waitlist promotion). RLS becomes simpler: members get SELECT only, all writes go through RPCs.

### A3. Add a "coach" role now, even if you don't ship it yet — **Quick win / Important**
Files: `supabase/migrations/001_schema.sql` (the `users.role` CHECK constraint), `lib/auth-helpers.ts` (`requireOwnerAuth`)

The schedule page returns `users(name)` regardless of `show_member_names` (review L4 / N14). When you eventually add a coach who's neither owner nor member, that endpoint leaks names to coaches at gyms where the owner has chosen not to share them.

Decide now: is the role hierarchy `owner > coach > member`, or are coaches a flag (`users.is_coach`)? Either way, design the RLS policies and the role-check helpers around three roles instead of two while everything is fresh.

### A4. Generated `class_instances` are not idempotent across template edits — **Project / Nice-to-have**
File: `app/api/cron/generate-instances/route.ts`

The cron only inserts new instances; it never updates or deletes. If a template's `local_time` or `capacity` changes, existing future instances keep the old values. Today the route handler updates instances directly when the owner edits the template, but the two paths can drift.

Either: (a) cron also UPDATEs instances when the underlying template changed and no bookings exist, or (b) generate instances *just-in-time* (on first member access) and stop caching them ahead. (b) is cleaner long-term.

### A5. `style_examples.raw_text` has no max-text-size constraint at the DB layer — **Quick win / Nice-to-have**
Files: `supabase/migrations/001_schema.sql` (the `raw_text text not null` line), `app/api/style/route.ts:23` (route-level check is `min: 10, max: 20000`)

Today the route caps at 20k chars but the column is unbounded `text`. A future route that forgets the cap or a bypass via service-role lets a single `style_examples` row blow up to gigabytes. Add `CHECK (char_length(raw_text) <= 50000)` for ~zero cost.

---

## Observability & operations

### O1. No application-level error tracking — **Quick win / Critical**
Currently every error path is `console.error('[ctx] msg', err)`. In production those land in Vercel logs as unstructured text — searchable by tag if you remember to grep, lost in scroll otherwise. You have no idea which gyms are seeing errors, no aggregation, no alerting.

Add Sentry (or Highlight, or Logtail). 30-minute setup. Adds:
- Per-error stack traces with source maps
- Release tagging
- Slack alert on error rate spikes
- "Affected user" attribution (be careful with PII — scrub email/name)

This single change pays for itself the first time a gym says "the app is broken" and you don't have to ask which page.

### O2. AI cost telemetry is "1 call = 1 unit" — **Project / Important**
Files: `lib/ai/spend-limit.ts`, every `app/api/style/*` and `app/api/workouts/*` route

`incrementAiCalls(gymId)` increments by 1 regardless of whether the call used 200 input tokens or 200,000. The Anthropic SDK returns `usage.input_tokens` and `usage.output_tokens` on every response. Capture them.

Add `ai_input_tokens_this_month` and `ai_output_tokens_this_month` columns to `gyms`. Switch `incrementAiCalls` to `incrementAiUsage(gymId, inputTokens, outputTokens)`. Now your monthly cap is meaningful (e.g., "100k input tokens / 30k output tokens / month") and your cost per gym is observable. Critical when you start charging.

### O3. Cron jobs have no monitoring — **Quick win / Important**
Files: `app/api/cron/generate-instances/route.ts`, `app/api/cron/waitlist-expire/route.ts`

Both crons silently console.error on partial failures. If `generate-instances` stops running entirely for a week (Vercel cron mis-configured, account suspended, env var renamed), no alert. The first signal is "nobody can book classes next week."

Add a "heartbeat" pattern: each cron POSTs to a healthcheck endpoint (Better Stack, Healthchecks.io, or a row in Supabase) on success. Alert if no heartbeat in 25 hours. Then layer on per-error alerts via O1.

### O4. No backup or point-in-time-recovery runbook — **Quick win / Critical**
Supabase provides PITR on Pro+ plans, but you don't have a documented "the gym says they accidentally deleted their members yesterday — recover the last 24 hours" procedure.

Write `docs/runbook/data-recovery.md` covering:
- Daily logical backup schedule (does Supabase do this for you, or do you need pg_dump on cron?)
- Where backups land (Supabase keeps them; verify retention)
- Test restore: pull a backup into a scratch project once a quarter and verify it loads
- Procedure for partial restore (one gym, one table)

A documented runbook you've actually tested matters more than buying a backup product.

### O5. Token rotation runbooks are missing — **Quick win / Nice-to-have**
Tokens that need rotation playbooks: `BOOKING_TOKEN_SECRET`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`.

For each: how to rotate, expected disruption window, downstream callers to update. Especially `BOOKING_TOKEN_SECRET` — rotating it invalidates every pending confirmation in flight (members get "invalid token" until cron sweeps them).

---

## Product & UX

### P1. No multi-factor auth on owner accounts — **Project / Critical**
Owner is the most powerful actor at any gym. A leaked password = full gym takeover (every member's bookings, every workout, the contact email used as reply-to for phishing). Supabase Auth supports TOTP enrolment.

Make MFA *required* for owners and admins, optional for members. Onboarding flow: prompt at first login after MFA goes live; soft-block until enrolled.

### P2. No audit log for owner actions — **Project / Important**
Files: schema-wide

You have `admin_audit_log` for platform-admin actions. There's no equivalent for owner actions: member deletions, settings changes, member revocations, workout publishes. When an owner says "I didn't delete that member" or a member disputes "the gym revoked my access," you have no answer.

Add `gym_audit_log` (gym_id, actor_id, action, target_id, target_type, payload jsonb, created_at). Insert from every owner-mutating route. RLS: gym owner reads own gym's log; nobody writes via REST (route handlers only).

### P3. Member email change has no flow — **Project / Important**
Files: `supabase/migrations/023_db_correctness.sql` (locks `email` in WITH CHECK), `app/(member)/profile/page.tsx`

The N9 fix locks `users.email` from member-side updates, which fixed the security hole — but didn't add a way for a member to legitimately change their email. Today: locked.

Add `/api/profile/email` POST: takes new email, sends a verification token to the new address, on click updates both `auth.users.email` (via service-role admin API) and `public.users.email`. Standard pattern.

### P4. Mobile UX is unverified — **Project / Important**
File: `app/layout.tsx` sets viewport correctly; `proxy.ts` enforces good headers. But none of the route components have been audited on a real phone.

Run a Lighthouse mobile audit on `/this-week`, `/login`, `/dashboard`, `/schedule`. Common findings: tap targets under 44pt, horizontal scroll on overflow, fonts that look fine on desktop but are unreadable at narrow widths. Schedule a half-day device-lab session.

### P5. Internationalization is hardcoded en-US — **Strategic / Nice-to-have**
Files: dozens — `app/api/bookings/route.ts:140-141`, `app/api/cron/waitlist-expire/route.ts`, every email template

```ts
new Date(instance.starts_at).toLocaleDateString('en-US', { … })
```

If you ever sign a non-US gym, dates render wrong (`May 8, 2026` vs `8 May 2026`), times wrong (`6:00 PM` vs `18:00`), email copy is English-only. Park this until you have a customer who needs it, but earmark `next-intl` or `paraglide` as the destination.

### P6. No cookie consent banner — **Project / Important**
Files: `app/layout.tsx`, no banner component

You have `app/privacy/page.tsx` and `app/terms/page.tsx` (note: still locked behind login per K3). For EU/UK visitors, GDPR requires explicit consent for non-essential cookies *before* they're set. Today Supabase's auth cookies are essential (no consent needed) but if you add analytics later (you should — see O1, P10), you need a banner.

Use `react-cookie-consent` or roll your own. One-evening project.

### P7. Loading states are inconsistent — **Quick win / Nice-to-have**
Files: only some routes have `loading.tsx` (e.g., `app/(member)/my-schedule/loading.tsx`). Most don't.

Walk every page route, add a `loading.tsx` skeleton beside it. Even a generic shimmer feels significantly faster than a blank screen during an SSR pause.

### P8. Empty states are bare — **Quick win / Nice-to-have**
A gym owner who just signed up sees: empty members list, empty schedule, empty workouts. The only call to action is whatever's on the dashboard.

Add empty-state cards: illustration + one-sentence explanation + primary action button. Stripe and Linear are good references. Lifts day-one activation.

### P9. No "ownership transfer" flow — **Strategic / Nice-to-have**
Files: schema-wide

`gyms.owner_id` is a single foreign key to `users.id`. If a gym is sold or the owner leaves, there's no in-app way to transfer ownership. Today it's a Supabase dashboard manual update.

Add `/api/gym/transfer-owner` POST → emails the new owner-elect → they accept → `users.role` flips for both, `gyms.owner_id` updates. Defer until requested by a real customer, but the schema is ready for it.

### P10. No analytics — **Project / Important**
You don't know which features get used. Booking completion rate vs cancellation. Average workouts published per gym per week. Feature requests vs feature usage.

Plausible (privacy-friendly), PostHog (richer), or Vercel Analytics (cheapest). Pair with O1 (Sentry) — they often share infrastructure.

---

## Compliance & legal

### C1. Privacy policy / terms blocked behind login — **Quick win / Critical**
Already documented in security review K3. Two-line proxy.ts change. Compliance issue, not security.

### C2. GDPR right-to-be-forgotten flow — **Project / Important**
Members and owners under EU/UK GDPR can request data deletion. You have hard-delete via the admin panel, but:
- No self-serve "delete my account" button for members
- No documented retention policy ("we delete bookings after 7 years for tax purposes")
- No DPO contact in the privacy policy

Spec a `/api/account/delete` flow + a 30-day-grace-period soft delete + confirmation email.

### C3. Data export — **Quick win / Important**
Same compliance frame: members can request a copy of their data. Today there's no way to.

`/api/account/export` returns a JSON blob of every row that mentions the user (`bookings`, `users`, derived attendance stats). Doesn't have to be pretty — has to exist.

### C4. Standard contractual clauses for sub-processors — **Quick win / Nice-to-have**
Anthropic, Resend, Supabase, Vercel, Upstash all process EU/UK personal data. List them in the privacy policy under "sub-processors" with their respective DPAs linked. Free; mostly editorial.

---

## Performance

### Pf1. Admin overview runs 7 parallel `count: 'exact', head: true` queries on every page load — **Quick win / Nice-to-have**
File: `app/(admin)/page.tsx:7-26`

Each `count: 'exact'` is a full table scan in Postgres. At small scale (hundreds of gyms) it's fine; at 10k+ it's seconds.

Three options, easiest first:
1. Cache the page with `export const revalidate = 60` — admin overview doesn't need to be real-time.
2. Replace counts with a materialized view refreshed on cron.
3. Use Postgres `pg_stat_user_tables.n_live_tup` for approximate counts (fast, slightly stale).

### Pf2. `getRecentWeeks` joins are not indexed — verify — **Quick win / Important**
File: `lib/workouts/get-recent-weeks.ts`

Migration 016 added several indexes. Confirm `workout_weeks(gym_id, status)` is among them. If not, the recent-weeks query scans the whole table per gym per workout-generate call.

### Pf3. Booking POST does 4 sequential round-trips before the RPC — **Project / Nice-to-have**
File: `app/api/bookings/route.ts:42-86`

Same-slot check, gym settings fetch, instance fetch, existing-cancelled lookup. All four could move into `insert_booking_atomic` for one round-trip total. Defer until profile data shows it matters.

### Pf4. No CDN caching strategy for static assets — **Quick win / Nice-to-have**
Vercel handles `_next/static` automatically. But `KovaLogo` is rendered as inline SVG in every page — consider extracting to a `public/logo.svg` referenced by `<Image>` so the browser caches it once.

---

## Growth-readiness

### G1. No public API surface — **Strategic / Nice-to-have**
Your routes are `app/api/...` for the web client. Eventually members will want a mobile app, owners will want to integrate with their POS/billing/membership platforms.

Plan for a versioned `app/api/v1/...` namespace with API-key auth (separate from session cookies), rate limited per key. Don't build now; namespace the existing routes so the move is mechanical when needed.

### G2. Webhooks for gym-side automation — **Strategic / Nice-to-have**
"Notify Slack when a class is fully booked" is a thing gyms will want. Today you'd build it; eventually they'll want to.

Schema: `gym_webhooks(id, gym_id, url, secret, events[])`. Trigger from a Postgres trigger or a route helper. HMAC-sign every payload (you already have the pattern from `lib/crypto/token.ts`).

### G3. Custom branding (white-label) — **Strategic / Nice-to-have**
Right now KOVA is the brand on every email and every page. Multi-gym SaaS often hits "can we use our own domain / colours / logo?" by year 2.

Schema: `gyms.brand_logo_url`, `gyms.brand_colour`, `gyms.email_from_name`. Resend supports custom from-domains via DNS.

---

## Quick-win bundle (one-day PR)

If I had a single uninterrupted day, this is what I'd ship:

1. **C1 / K3** — open `/privacy` and `/terms` to unauthenticated users (proxy.ts allowlist)
2. **K4** — move HSTS into `next.config.mjs` for uniform header coverage
3. **T4** — delete `BOOKING_ADVANCE_DAYS`, fix the test that depends on it
4. **A5** — add `CHECK (char_length(raw_text) <= 50000)` to `style_examples`
5. **O1** — wire Sentry (or equivalent) — 30 minutes plus PII-scrub config
6. **O3** — add a healthcheck heartbeat for both crons
7. **P7** — add `loading.tsx` to every page that doesn't have one
8. **T3** — regenerate `lib/supabase/types.ts` from migrations

Each is a low-risk change that compounds with the others.

---

## Strategic projects (one per month, in order)

1. **T1 — Postgres-backed integration tests.** Highest leverage, prevents R1-style regressions forever.
2. **A1+A2 — booking state machine + RPCs.** Shrinks routes, simplifies RLS, makes A3 (coach role) and P3 (email change) trivial later.
3. **O2 — token-level AI cost telemetry.** Required before pricing.
4. **P1 — owner MFA.** Required before any real customer trusts you.
5. **P2 — owner audit log.** Required to handle the first real "I didn't do that" dispute.

This list is ten years of work if taken whole. Pick the top one or two for next quarter; let the rest live in a backlog you re-rank quarterly.
