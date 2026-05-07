# Security Review — 2026-05-06 (round 4)

Re-review of `crossfit-app` on branch `fix/review-findings` after the round-3 fixes (commits `96e7679`, `1669cc7`, `ae9f93a`). **No code changes were made.**

Bottom line: round-3 issues are correctly addressed. New findings are Medium-and-below. The previous round's lone Critical (`R2`, leaked service-role key) needs an external action confirmed: **the key still has to be rotated in the Supabase dashboard** — deleting `scripts/migrate-009.mjs` from `HEAD` does not remove it from git history, and that history is still in `git log`.

Severity scale: **Critical / High / Medium / Low / Info**

---

## Status of round-3 findings

| Prior | Title | Status |
|-------|---|---|
| C1 | CSP `unsafe-inline` + `unsafe-eval` | Fixed — `proxy.ts:92-104` per-request nonce; `unsafe-eval` only in dev |
| R1 | Migration 022 broke confirm + waitlist promote | Fixed — `app/api/bookings/confirm/[token]/route.ts:125` switched to admin client; both `promoteNextWaitlistMember` call sites pass `createAdminClient()` |
| R2 | Leaked service-role key in git | **Partially** — file deleted (commit `96e7679`), but key still recoverable from history (`git show 58dc9f3:scripts/migrate-009.mjs`). See K1 below. |
| R3 | Signup orphan gym | Fixed — `app/api/auth/signup/route.ts:70-83` rollback now deletes gym row; final owner_id update is checked |
| R4 | `insert_booking_atomic` defence-in-depth | Fixed — migration 024 adds `auth.role()` guard, drops `p_capacity`, cross-checks gym_id, asserts existing-row gym_id |
| R5 / R11 | CSRF cookie name + path + Secure | Fixed — `_kova_confirm_csrf`, `Path=/api/bookings/confirm/${token}`, `Secure` flag set |
| R6 | CSRF compare timing-safe | Fixed — `crypto.timingSafeEqual` at `app/api/bookings/confirm/[token]/route.ts:139` |
| R7 | Spend-limit transient vs missing | Fixed — `lib/ai/spend-limit.ts:43-55` distinguishes error from null |
| R8 | Tests duplicate parsing logic | Fixed — `tests/lib/admin-auth.test.ts:3` imports `isAdminEmail` |
| R9 | Tests don't exercise route | Acknowledged with comment; integration harness still TBD (informational) |
| N12 | Invite hash strip ordering | Fixed — `app/(auth)/invite/page.tsx:46-49` strips before async `setSession()` |
| N18 | Headers on redirect responses | Fixed — `next.config.mjs` adds X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy globally |
| R14 / N11 | Env docs | Fixed — `.env.example` documents every var |

The whole 26-finding list from rounds 1-3 is now closed except for the action items called out below. That's a clean run for the code-side fixes.

---

# New / remaining findings

## High

### K1. Leaked service-role JWT remains recoverable from git history
Files: history of `scripts/migrate-009.mjs` (added in `58dc9f3`, removed in `96e7679`)

```
$ git log -- scripts/migrate-009.mjs
96e7679 fix(R1-R7): round-3 security fixes — confirm flow, leaked key, hardening
58dc9f3 feat: add class types system, scaling modals, day dropdown, and schedule improvements

$ git show 58dc9f3:scripts/migrate-009.mjs | head -3
// Run: node scripts/migrate-009.mjs
const SUPABASE_URL = 'https://ncpxagtwgaxgbuxmuvmu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJ…REDACTED—key-rotated'
```

Until the **Supabase service-role key has actually been rotated** in the project dashboard, the JWT in commit `58dc9f3` still works. `exp = 2089872755` → valid until February 2036. Anyone with read access to the repository (collaborators, anyone who has cloned, anyone seeing the GitHub mirror, anyone with read access via Vercel's git integration) can decode it from history and use it.

The R3 commit message says `ROTATE THE KEY in Supabase dashboard immediately`. I cannot confirm from the working tree whether that step actually happened. If yes → severity drops to Info (the leaked token is dead). If no → it's Critical.

**Action**
1. **Verify rotation:** Supabase dashboard → Settings → API → confirm `service_role` was reset after April 8 2026. Vercel → Project → Settings → Environment Variables → confirm `SUPABASE_SERVICE_ROLE_KEY` value updated and redeployed.
2. **Optional history scrub:** even after rotation, the leaked value is in `git log`. If the repo is public or shared with non-staff, run
   ```
   git filter-repo --path scripts/migrate-009.mjs --invert-paths
   ```
   then force-push. Update every fork. Without scrubbing, a future audit will keep flagging this — even though the token is dead.
3. **Pre-commit hook:** install `gitleaks` or `trufflehog` so this class of mistake is caught before the commit lands. Sample config: https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml.

### K2. Round-3 review document quotes the leaked JWT in full
File: `docs/security-review-2026-05-05-r3.md:73`

The same JWT is reproduced verbatim in the round-3 review for documentation purposes. The file is currently **untracked** (not yet committed):

```
$ git status -s docs/
?? docs/security-review-2026-05-05-r3.md
```

So today the leak hasn't expanded — but the next `git add docs/ && git commit` will commit the full token to history *again*, undoing whatever scrub may follow K1.

**Fix plan**
1. Before committing the docs/ directory, redact the JWT in `security-review-2026-05-05-r3.md` (replace with `eyJ…REDACTED`).
2. Verify with `gitleaks detect --staged` before each commit going forward.
3. Same fix for any future review doc that reproduces credentials.

---

## Medium

### K3. `/privacy` and `/terms` are blocked for unauthenticated users
File: `proxy.ts:54-64`

```ts
if (
  !user &&
  path !== '/' &&
  !path.startsWith('/login') &&
  !path.startsWith('/signup') &&
  !path.startsWith('/invite') &&
  !path.startsWith('/auth/callback') &&
  path !== '/suspended'
) {
  return NextResponse.redirect(new URL('/login', request.url))
}
```

Newly-added pages `app/privacy/page.tsx` and `app/terms/page.tsx` are not in the allowlist. A prospective customer following a "Read our Privacy Policy" link is redirected to `/login`, can't sign up, can't read what they're agreeing to. This has compliance impact:
- **GDPR / UK GDPR** require pre-contract notice of data processing; users must be able to read the privacy policy *before* providing personal data on signup.
- **CCPA** has similar transparency requirements.
- **Apple/Google app reviews** flag this if the marketing site links to a login-walled policy.

Severity Medium because it's privacy/legal compliance, not technical security — but it's a regression introduced in the same review cycle.

**Fix:** add `path !== '/privacy' && path !== '/terms'` to the unauthenticated allowlist (or generalise to `!['/privacy', '/terms', '/suspended', '/'].includes(path)`).

### K4. `next.config.mjs` global headers and `proxy.ts` headers don't fully overlap — API redirects miss CSP and HSTS
Files: `next.config.mjs`, `proxy.ts:92-110`

The N18 fix added X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy to *every* response via Next's `headers()` config. The proxy still sets HSTS and CSP, but its matcher excludes `/api`. So API responses get four of six security headers:

| Header | Set on `/api/*` responses? |
|---|---|
| X-Frame-Options | ✓ (next.config) |
| X-Content-Type-Options | ✓ (next.config) |
| Referrer-Policy | ✓ (next.config) |
| Permissions-Policy | ✓ (next.config) |
| **Strict-Transport-Security** | ✗ |
| **Content-Security-Policy** | ✗ |

CSP on JSON API responses is largely moot. HSTS is not — Vercel sets HSTS at the edge by default, so this is informational on Vercel but a real gap if the app ever moves to a non-Vercel host.

**Fix:** move HSTS into `next.config.mjs:headers()` so it covers every route uniformly.

### K5. `next/font/google` makes outbound HTTP requests at build time — supply-chain pin
File: `app/layout.tsx:2`

```ts
import { Bebas_Neue, DM_Sans } from 'next/font/google'
```

`next/font/google` fetches font files from `fonts.gstatic.com` *during the build*. The fetched `.woff2` blob is then bundled. There's no `integrity` hash in the bundle, no pinning to a specific font version. If Google's font CDN is compromised or returns an attacker-tampered font during a future build, the malicious bytes are baked into the production bundle.

This is a classic build-supply-chain risk. Probability is very low (Google's CDN is well-defended), impact is the binary font file — fonts can theoretically embed exploits via malformed glyphs but real-world attacks are rare.

**Fix:**
1. Self-host the fonts: download once, place in `public/fonts/`, swap to `next/font/local`. Repeatable builds, no runtime/build dependency on Google.
2. Or: at minimum, document the dependency in `docs/build-deps.md` so it's known.

### K6. CSP nonce path is reliant on Next.js's undocumented `x-nonce` header convention
File: `proxy.ts:11-13`

The CSP fix sets `requestHeaders.set('x-nonce', nonce)` and trusts Next.js to apply it to its own inline hydration scripts. This *is* the supported pattern (Next.js docs: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy), but:

1. **No automated test** that the nonce actually appears on the bootstrap script — a Next.js minor upgrade that changes the convention silently breaks the entire app (white screen on page load).
2. **`app/layout.tsx` doesn't read the nonce** to apply it to any custom `<Script>` components. Today there are none, but the moment one is added without `nonce={...}`, hydration breaks.
3. **No `report-uri` / `report-to`** directive — CSP violations are invisible. If a third-party script is added later without a nonce, the only signal is "the page is blank in production."

**Fix plan**
1. Add a build-time test (Playwright / Cypress smoke) that loads `/` and asserts `document.querySelectorAll('script[nonce]').length > 0`.
2. Add a `report-to` endpoint and a `Reporting-Endpoints` header so violations land somewhere actionable.
3. In `app/layout.tsx`, read `headers().get('x-nonce')` once and prop-drill it to any future `<Script>` to keep the convention consistent.

### K7. `incrementAiCalls` race window persists; cap is unsafe under concurrency
File: `lib/ai/spend-limit.ts:68-93`

The R6 fix was the NaN parse + service-role removal. The read-modify-write pattern remains:

```ts
const { data } = await supabase.from('gyms').select('ai_calls_this_month, ai_month').eq('id', gymId).single()
…
await supabase.from('gyms').update({ ai_calls_this_month: (data.ai_calls_this_month ?? 0) + 1 }).eq('id', gymId)
```

Under concurrency, two simultaneous AI calls both read `count = LIMIT - 1`, both increment to `LIMIT`, but the actual increment runs twice — final value is still `LIMIT`, one call is "free." Aggregate impact: small budget hole, scales linearly with how often callers race. The Upstash rate-limit (10 req/min) caps this in practice.

This was acknowledged in round 2 as acceptable. Re-flagging because once N (number of routes calling the limiter) grows or the per-minute cap rises, the over-count grows too. It's a one-line fix:

```sql
UPDATE gyms
   SET ai_calls_this_month = CASE WHEN ai_month = $1 THEN ai_calls_this_month + 1 ELSE 1 END,
       ai_month = $1
 WHERE id = $2
RETURNING ai_calls_this_month
```

**Fix:** convert to a single `UPDATE … RETURNING` or a stored function so the increment is atomic. Use the returned count to gate further calls in the same request.

### K8. Booking POST does a `select('id, status').eq('user_id', user.id)…maybeSingle()` for `existing` *before* the RPC — not under the lock
File: `app/api/bookings/route.ts:84-86`

```ts
const { data: existing } = await supabase.from('bookings')
  .select('id').eq('instance_id', instanceId).eq('user_id', user.id).eq('status', 'cancelled').maybeSingle()
```

This SELECT runs outside the FOR UPDATE row lock that the RPC takes later. Two concurrent re-bookings of the same cancelled row can both read `existing = {id: X}`, both pass it to the RPC, the RPC's UPDATE then runs twice — second update is a no-op because the first already moved status away from cancelled (the `WHERE id = p_existing_id AND user_id = p_user_id AND gym_id = p_gym_id` matches but the row is no longer cancelled). The second call returns success with `booking_id = X` but `status = ` whatever the first call wrote.

Net effect: usually fine (idempotent re-book). Failure mode: the second call thinks it succeeded with one status, but the user's actual state is the other call's status. Edge case, low impact.

**Fix:** move the `existing` lookup *into* `insert_booking_atomic` (after the FOR UPDATE on `class_instances`, before the count). One round-trip instead of two, no race.

---

## Low / Info

### K9. CSP nonce uses standard base64 — `+`, `/`, `=` characters are valid in `'nonce-…'` but harder to debug
File: `proxy.ts:11`

`randomBytes(16).toString('base64')` produces e.g. `g7H+9mK/1aBcD==`. Spec-allowed but easy to misuse if someone copy-pastes through a URL. Use base64url (`.toString('base64url')`) for cleaner output. Cosmetic; not a vulnerability.

### K10. Supabase fonts CSS uses `font-display: swap` (default) — FOUT can leak layout state
Not a security issue. Skipping.

### K11. `app/api/cron/*` routes have `maxDuration` 300s but no auth-fail rate-limit
A cron-secret guess attack is implausible (32-byte HMAC), but if `CRON_SECRET` ever becomes a short string, a bot could brute force without throttling. `lib/api/cron-auth.ts` returns `401` on mismatch with no rate limit. Defence-in-depth nit.

### K12. Tests still don't exercise the actual route handlers (R9 acknowledged but not addressed)
`tests/api/bookings.test.ts:5-16` still inlines logic mirrors. The "needs a DB integration harness" comment is good, but the lack of one means future bugs of the R1 flavour (RLS narrowing breaks a flow) won't be caught until prod. Not a security finding per se, just a permanent gap in defence.

### K13. `app/(auth)/invite/page.tsx` hash-strip narrows but does not eliminate the third-party-JS-reads-token race
File: `app/(auth)/invite/page.tsx:46-48`

The `replaceState` runs in `useEffect` — i.e., after React mounts. Anything that runs synchronously during the *initial render pass* (a synchronous SDK that reads `window.location.hash` in module-scope, e.g., Sentry's BrowserTracing if mis-configured) still sees the token. Today no such SDK runs.

A more robust fix: a tiny synchronous `<script nonce={…}>` rendered server-side at the top of `<head>` that strips the hash before any other script runs. With the new CSP nonce in place, this is now a one-liner. Defer until the first third-party JS appears.

### K14. `BOOKING_TOKEN_SECRET` rotation still has no documented procedure
File: `lib/crypto/token.ts:11-14`

`.env.example` documents the var but not how to rotate it. Rotating mid-flight invalidates every pending confirmation token in flight. The existing `verifyToken` path returns null on signature mismatch and the cron sweeps expired pending bookings — so the failure mode is "members get 'invalid token' errors for a window." That's manageable but should be in a runbook.

**Fix:** add `docs/runbook/token-rotation.md` describing: schedule rotation for a low-traffic window, expect a 2-hour disruption (the confirmation TTL), watch the waitlist-expire cron logs.

---

## Recommended order

1. **K1** — confirm the Supabase service-role key has actually been rotated. This is the only outstanding action that could matter today.
2. **K2** — redact the JWT from `security-review-2026-05-05-r3.md` before committing the docs/ directory.
3. **K3** — open `/privacy` and `/terms` to unauthenticated users.
4. **K4** — move HSTS into `next.config.mjs`.
5. **K5–K8** — bundle as a hardening PR.
6. **K9–K14** — opportunistic cleanup.

If K1 confirms the key was rotated and K2 is handled before the next commit, this branch is **as clean as a security review can credibly call it without a Postgres-backed integration test harness running against the migrations.** The remaining items are defence-in-depth, runbooks, and compliance — no exploitable code paths I could find.

No code was modified during this review.
