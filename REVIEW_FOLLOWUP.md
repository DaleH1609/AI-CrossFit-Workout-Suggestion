# Review Follow-up Plan

Leftover Medium and Low severity findings from the nine-agent code review (April 2026). Critical and High items were fixed in batches 1–6 on branch `(this branch)`. Batches 7+ below cover the remainder and can be done independently — pick any batch, commit it, move on.

Conventions established in earlier batches (keep using them):

- Route handlers: `parseBody(req, schema)` → return `jsonOk(data)` / `jsonError(msg, 400)` / `jsonServerError(ctx, cause)` from `lib/api/response.ts`.
- Validation: hand-rolled `z` from `lib/validation/z.ts` (zero-dep zod shim — use this, not the real zod package).
- Frontend fetches: `try { const res = await fetch(...); if (!res.ok) { ... toast(err, 'error') } } catch { ... }`.
- Supabase edge functions (Deno) are deprecated; all cron lives in `app/api/cron/*`.
- Tests: `vitest run`. Native bindings must be installed locally (`rm -rf node_modules package-lock.json && npm install`).
- Commits: one per batch, signed off, new branch `review-fixes/medium-low`.

---

## Batch 7 — Unify API response envelope

**Why**: Some routes return `{ booking }`, others `{ success: true }`, others bare objects. Frontend checks are inconsistent, and raw Supabase error strings leak through in a handful of places.

**Steps**

1. Grep every route handler under `app/api/**/route.ts`:
   ```
   Grep for: NextResponse.json
   ```
   For each, replace success returns with `jsonOk(data)` and error returns with `jsonError(msg, status)`. Internal failures go through `jsonServerError('<ctx>', err)`.
2. Standardize status codes:
   - `401` = not authenticated
   - `403` = authenticated but wrong role / wrong gym
   - `404` = resource doesn't exist for this user
   - `409` = conflict (already booked, already invited, etc.)
   - `400` = bad input
3. Update every frontend caller. The envelope is now `{ data: ... }` on success and `{ error: string }` on failure. Search for `.then(res => res.json())` and ensure callers read `body.data` not bare fields.
4. Add input validation (via `parseBody + z`) to any route that still accepts unchecked JSON. Known gaps: `/api/schedule/defaults`, `/api/class-types` (all methods), `/api/members/restore`, `/api/style`, `/api/workouts/generate`.
5. Write a snapshot-style test: pick 3–5 key routes, POST invalid input, assert shape is exactly `{ error: string }` with the right status.

**Acceptance**: `grep -r 'NextResponse.json' app/api` shows zero direct usages; every route calls a helper. `tsc --noEmit` clean. Lint clean.

---

## Batch 8 — Frontend accessibility cleanup

**Why**: A11y audit surfaced several small-but-real issues. Low friction, high user-trust value.

**Steps**

1. **Attendance toggle** (`app/(owner)/schedule/page.tsx`, around the `handleAttendanceToggle` button): add `aria-pressed={booking.attended === true}` and `aria-label="{memberName} attendance — {state}"`.
2. **Span-as-button**: `grep -rn 'role="button"' components app` and convert every one to a real `<button type="button">`. Preserve existing className and focus behaviour. Add missing Escape handlers.
3. **Decorative SVGs**: `grep -rn '<svg' components app | grep -v 'aria-hidden'` — every decorative SVG (icons inside buttons, chevrons, dots) needs `aria-hidden="true"`. The owner sidebar is the worst offender.
4. **Contrast**: replace `text-green-400` and `text-yellow-400` on light-ish backgrounds with the theme tokens `text-accent` / `text-success` / `text-warning`. If those tokens don't exist, add them in `globals.css` with WCAG AA-compliant hex values.
5. **Empty states**: `app/(member)/this-week/page.tsx` around lines 99–108 — wrap the empty-state block in `<section aria-label="No classes this week">`.
6. **Loading skeletons**: search for hardcoded hex `#...` inside `animate-pulse` divs and replace with `bg-surface` / `bg-border` so dark mode works.
7. **Week-day-view scroll affordance**: `components/booking/week-day-view.tsx` — add a subtle right-side gradient fade and `aria-label="Scroll horizontally for more days"` so users know the content scrolls.

**Acceptance**: Run axe DevTools manually on `/this-week`, `/members`, `/schedule`, `/dashboard`. Zero new violations. Lighthouse a11y score ≥ 95.

---

## Batch 9 — Security hardening

**Why**: Confirmation tokens are unsigned UUIDs; cron is protected only by a bearer secret; hardcoded sender addresses conflict with env config.

**Steps**

1. **Sign booking confirmation tokens**:
   - New `lib/crypto/token.ts` with `signToken(bookingId, expiresAtMs): string` and `verifyToken(token): { bookingId, expiresAtMs } | null` using HMAC-SHA256 against a new env var `BOOKING_TOKEN_SECRET`.
   - Replace UUID generation in `promoteNextWaitlistMember` (`lib/bookings/waitlist.ts`) with `signToken`.
   - Confirm endpoint `app/api/bookings/confirm/[token]/route.ts` calls `verifyToken(token)` first; on failure returns a generic "link invalid or expired" page.
   - Drop the `confirmation_token` column's role as a lookup — still store it for audit but look up the booking by decoded `bookingId`.
   - Migration: add `confirmation_token_v2` text, backfill null, add index.
2. **CRON_SECRET → signed timestamp**:
   - Keep the bearer auth for backwards compat with Vercel's cron UI.
   - Optional upgrade: Vercel sends `x-vercel-signature` headers — use those instead where available. Document rotation procedure in `docs/cron.md`.
3. **Unify from-address**: grep for `'noreply@yourgym.com'` in the codebase; every occurrence reads `process.env.RESEND_FROM_EMAIL` via `lib/email/send.ts`.
4. **Timezone in confirmation emails**: `lib/email/templates.ts` — format the expiry time in the gym's timezone (pass `gym.timezone` into the template, use `Intl.DateTimeFormat` with `timeZone`).
5. **Delete deprecated Deno stubs**: `rm -rf supabase/functions/{process-waitlist-expiry,generate-class-instances,_shared}` once you're sure nothing else invokes them. (Couldn't be deleted from the sandbox — must be done locally.)

**Acceptance**: Tamper with a confirmation token in the URL → get the generic failure page, not a 500. `grep -r 'yourgym.com'` returns zero. Token secret is in Vercel env, not committed.

---

## Batch 10 — Performance tuning

**Why**: Low-hanging wins in query counts and caching.

**Steps**

1. **Combine booking count queries**: `app/api/bookings/route.ts` around lines 60–72 — two separate `.select('count')` calls can become one `.select('id, status')` and counted in JS, or a single Postgres function. Pick whichever is cleaner.
2. **Add `revalidate` directives**:
   - `app/api/workouts/route.ts` → `export const revalidate = 60`
   - `app/api/schedule/templates/route.ts` GET → `export const revalidate = 300`
   - `app/api/class-types/route.ts` GET → `export const revalidate = 300`
   - Anything else read-heavy that doesn't need real-time freshness.
3. **Dashboard tweak**: the `order by created_at limit(1) maybeSingle()` pattern — if what you want is "the latest row", use `.order('created_at', { ascending: false }).limit(1).maybeSingle()` (it may already be — check).
4. **Bundle audit**: `next build` + `next build --profile` and check if `@anthropic-ai/sdk` is leaking into client bundles. Should be server-only. If it's bleeding into the client, move any shared types to a separate file that doesn't pull in the SDK.

**Acceptance**: Bookings endpoint shows one DB round-trip per booking in local supabase logs. Lighthouse performance ≥ 90 on `/this-week`.

---

## Batch 11 — Architecture cleanup

**Why**: Long-term maintainability. Safe to defer but worth scheduling before the codebase doubles in size.

**Steps**

1. **Type consolidation**:
   - Audit `lib/types.ts` against every inline `interface` in pages / components. Move to `lib/types.ts` and re-export.
   - Search: `grep -rn 'interface ' app components | grep -v '.test.'` → every result should be justifiable or moved.
2. **Extract form hooks**:
   - `components/schedule/capacity-popover.tsx` — pull state + validation into `useCapacityForm(template)` in `lib/hooks/`.
   - `components/workout/workout-edit-modal.tsx` — pull into `useWorkoutEditForm(weekId, dayIndex)`.
   - Component becomes a pure view.
3. **Dedupe error boundaries**: create `components/ui/route-error.tsx` that takes `{ error, reset, title? }` and replace the four near-duplicates in `app/(owner)/dashboard/error.tsx`, `app/(member)/this-week/error.tsx`, etc. Add Sentry/Logsnag reporting in one place.
4. **Server actions decision**: either (a) migrate a handful of simple mutations (invite member, update default capacity) to server actions for ergonomics, or (b) document in `docs/architecture.md` why you stuck with REST routes. Either is fine — don't leave it undecided.

**Acceptance**: `grep -rn 'interface ' app components | wc -l` drops significantly. `components/ui/route-error.tsx` exists and is used by every `error.tsx`.

---

## Batch 12 — Dependency audit cleanup

**Why**: Keeps CI fast and lockfile honest.

**Steps**

1. `npm prune` to remove `@emnapi/*`, `@tybys/wasm-util`, and anything else not in `package.json`.
2. Pin React exactly:
   ```
   "react": "18.3.1",
   "react-dom": "18.3.1",
   ```
   (match whatever Next.js 14.2.35 wants — check `node_modules/next/package.json` peerDependencies).
3. `lucide-react` decision: if it's only used on the landing page, either inline the one SVG or commit to it across the app. Don't leave it as dead weight.
4. `npm audit --production` and address any HIGH or CRITICAL vulnerabilities.

**Acceptance**: `npm ci` on a clean clone produces an identical `node_modules` to the committed `package-lock.json`. `npm audit --production` reports zero highs or criticals.

---

## Batch 13 — Final verification

Same as the last pass:

1. `rm -rf node_modules package-lock.json && npm install` (clean slate — fixes the rolldown native binding).
2. `npm run lint` → zero warnings.
3. `./node_modules/.bin/tsc --noEmit` → zero errors.
4. `npm test` → vitest suite green.
5. `npm run build` → production build succeeds.
6. Apply migration `016_review_fixes.sql` (plus any new migration from Batch 9) against staging, smoke-test, then prod.
7. Merge to `main` after review.

---

## Tracking

Check each batch off as you finish it:

- [x] Batch 7 — API envelope unification
- [x] Batch 8 — A11y cleanup
- [x] Batch 9 — Security hardening *(Deno stubs still need local `rm -rf`, see below)*
- [x] Batch 10 — Performance tuning
- [x] Batch 11 — Architecture cleanup
- [x] Batch 12 — Dependency audit *(code-side changes done; run npm prune + audit locally)*
- [ ] Batch 13 — Final verification *(must run locally — sandbox can't do `npm install` / `next build`)*

## Local-only follow-ups

The sandbox overlay filesystem and missing network allowlist block a few steps.
These must be run on a normal machine before merging:

1. **Delete deprecated Supabase edge functions:**
   ```
   rm -rf supabase/functions/{process-waitlist-expiry,generate-class-instances,_shared}
   ```
   (Keep `supabase/functions/README.md` if you want a tombstone.)
2. **Clean install + prune:**
   ```
   rm -rf node_modules package-lock.json && npm install
   npm prune
   ```
3. **Audit + fix:**
   ```
   npm audit --omit=dev
   ```
   Address anything HIGH/CRITICAL before merging.
4. **Verify pipeline:**
   ```
   npm run lint
   ./node_modules/.bin/tsc --noEmit
   npm test
   npm run build
   ```
5. **Set production secrets** (see `docs/security.md`):
   - `BOOKING_TOKEN_SECRET` = `openssl rand -base64 32`
   - `CRON_SECRET` = `openssl rand -base64 32`
   - `RESEND_FROM_EMAIL` = the verified Resend sender (the app now throws loud if unset)
6. **Apply migration `016_review_fixes.sql`** against staging → smoke test → prod.

Notes for whoever picks this up (future-you or a fresh Claude session): the batches are intentionally independent. Batches 7, 8, 10, and 12 are low-risk; Batches 9 and 11 touch more files and should get their own PR each.
