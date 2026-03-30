# Class Management — Design Spec

## Goal

Add two class management features to improve the owner's visibility into attendance and ensure waitlisted members are automatically promoted when a spot opens.

---

## Prerequisites / Environment Variables

- `CRON_SECRET` — must be set in Vercel project settings (production + preview) and in `.env.local` for local testing. Used to secure the cron endpoint.
- `NEXT_PUBLIC_APP_URL` — already provisioned.

---

## Feature 1: Attendance Tracking

### Purpose

Allow the owner to mark which members attended each class. Provide a per-member monthly attendance count on the members page.

### UX

**Schedule view (owner):**
- Clicking a class on the schedule opens a detail panel showing all confirmed bookings for that class
- Each member row has a three-state toggle: unmarked (default) → attended → no-show
- Changes save immediately via PATCH request

**Members page:**
- Each member card shows "X classes this month"
- Count is fetched from a new `GET /api/members/attendance` endpoint (keeps the members page as a client component — no architectural refactor needed)
- The endpoint computes: count of bookings where `attended = true` joined to `class_instances` where `starts_at` falls within the current calendar month in the gym's local timezone (`gyms.timezone`). The month boundary is converted to UTC for the DB query.
- Only includes active (non-revoked) members with `role = 'member'` and `revoked_at IS NULL`. Revoked or deleted member IDs are excluded from the returned map.

### API

**`PATCH /api/bookings/[id]/attend`**
- Body: `{ attended: true | false | null }`
- Auth: owner-only via `requireOwnerAuth()`
- Cross-checks `bookings.gym_id = userData.gym_id` — returns `403` if mismatch
- Only allows marking on bookings with `status = 'confirmed'` — returns `400` otherwise
- Returns `{ success: true }`

**`GET /api/members/attendance`**
- Auth: owner-only via `requireOwnerAuth()`
- Returns `{ attendance: { [userId]: number } }` — map of active member user ID to classes attended this month
- Query: join `bookings` (gym_id = owner's gym, attended = true) → `class_instances` (starts_at in current month UTC range), filter to user_ids where the user has `role = 'member'` and `revoked_at IS NULL`. Group by user_id, count rows.
- Note: low query volume; no index required at this stage.

### Behaviour

- Marking attendance has no side effects — no emails, no status changes
- Attendance can be unmarked (set back to null) if marked in error
- Waitlisted and cancelled bookings cannot have attendance marked (API returns `400`)

---

## Feature 2: Waitlist Auto-Promotion

### Purpose

When a confirmed booking is cancelled, automatically notify the next waitlisted member that a spot has opened. Give them a time-limited window to confirm. If they don't respond, the spot goes to the next person.

### Existing Infrastructure

The codebase already has:
- `lib/bookings/waitlist.ts` — `promoteNextWaitlistMember(supabase, instanceId, startsAt, appUrl)`, `shouldSkipPromotion(startsAt)` (skips when `time until class <= 2 hours`), `getConfirmationWindow(startsAt)` (returns `Math.min(TWO_HOURS_MS, timeUntilClass)` in ms — in practice always returns `TWO_HOURS_MS` since `shouldSkipPromotion` gates calls to this function)
- `lib/email/send.ts` — `sendWaitlistPromotion(email, details)` (subject: "Spot Available — Confirm Now")
- `bookings.confirmation_expires_at` — existing timestamptz column
- `supabase/functions/process-waitlist-expiry/index.ts` — existing Supabase Edge Function that performs waitlist expiry. **This function is retired as part of this spec.** The Vercel cron job replaces it. See "Retiring the Supabase Edge Function" below.

**This feature extends the existing waitlist infrastructure; it does not replace it.**

### Retiring the Supabase Edge Function

`supabase/functions/process-waitlist-expiry/index.ts` currently handles expiry. Running both it and the new Vercel cron simultaneously would cause double-processing (double-promotion, double-emails). The Edge Function must be **disabled in the Supabase dashboard** (Project Settings → Edge Functions → disable or delete `process-waitlist-expiry`) before the Vercel cron goes live. The function file can remain in the repo for reference but should not be scheduled.

### Promotion Flow

1. A `confirmed` or `pending_confirmation` booking is cancelled
2. Call `promoteNextWaitlistMember(supabase, instanceId, startsAt, appUrl)` — all four arguments required; import from `lib/bookings/waitlist`
3. `shouldSkipPromotion(startsAt)` gates the call — skips if `time until class <= 2 hours`
4. Otherwise: finds the next `waitlisted` booking (lowest `waitlist_position`), generates a UUID `confirmation_token`, sets status → `pending_confirmation`, sets `confirmation_expires_at` → `Date.now() + getConfirmationWindow(startsAt)` (effectively `now + 2h`), sends email
5. If no waitlisted bookings exist, nothing happens

### Cancellation Paths That Must Trigger Promotion

| Path | Currently calls promotion? | Change needed |
|------|---------------------------|---------------|
| `DELETE /api/bookings` — member self-cancel | ✅ Yes | None |
| `POST /api/members/revoke` — batch-cancels `confirmed`, `waitlisted`, and `pending_confirmation` bookings | ❌ No | **Before** executing the bulk cancel UPDATE, capture the list of `instance_id` values from the pre-fetch query results where `status IN ('confirmed', 'pending_confirmation')` only (not `waitlisted` — cancelling a waitlisted slot does not open a spot). The status information is lost once the bulk UPDATE overwrites it. After the bulk cancel completes, call `promoteNextWaitlistMember(supabase, instanceId, startsAt, appUrl)` for each captured `instance_id`, fetching `starts_at` from `class_instances`. |
| `POST /api/members/delete` — same cancellation logic as revoke | ❌ No | Same as above |

### Confirmation Flow

1. Member clicks the link → `GET /api/bookings/confirm/[token]`
2. **Valid:** token found, booking is `pending_confirmation`, `confirmation_expires_at > now()`
   - Update: `status → 'confirmed'`, `confirmation_token → null`, `confirmation_expires_at → null`, `waitlist_position → null`
   - Member lands on success page
3. **Expired or invalid:** token not found, booking not `pending_confirmation`, or `confirmation_expires_at <= now()`
   - Update expired booking: `status → 'cancelled'`, `confirmation_token → null`, `confirmation_expires_at → null`, `waitlist_position → null`
   - Member sees "this link has expired" page
   - **Bug fix:** current code sets `status → 'waitlisted'` in this path — must be changed to `'cancelled'`

### Expired Booking Behaviour

Expired `pending_confirmation` bookings are set to **`cancelled`** (not re-queued). The member is removed from the waitlist entirely. `waitlist_position` is nulled. Applies in both the cron path and the confirm-handler expired path.

### Cron Job: `/api/cron/waitlist-expire`

Replaces `supabase/functions/process-waitlist-expiry`. See "Retiring the Supabase Edge Function" above.

- Runs every 30 minutes (configured in `vercel.json`)
- Secured: checks `Authorization` header equals `Bearer ${process.env.CRON_SECRET}` — returns `401` if missing or wrong
- Query: all `pending_confirmation` bookings where `confirmation_expires_at < now()`
- For each expired booking:
  1. Update: `status → 'cancelled'`, `confirmation_token → null`, `confirmation_expires_at → null`, `waitlist_position → null`
  2. Fetch `starts_at` from `class_instances` for this booking's `instance_id`
  3. Call `promoteNextWaitlistMember(supabase, instanceId, startsAt, appUrl)`
- Multiple expirations for the same `instance_id` in one cron run: each represents a genuinely open spot (each expired `pending_confirmation` booking was holding a real class slot). Process all of them — calling `promoteNextWaitlistMember` once per expiry is correct and will promote one new person per open spot. No deduplication by `instance_id` is needed.

---

## Schema Changes

### Migration 006 — attendance

```sql
alter table bookings add column attended boolean;
```

- `null` = not yet marked
- `true` = attended
- `false` = no-show

No index at this stage. No other schema changes — `confirmation_expires_at` already exists.

---

## File Structure

| File | Change |
|------|--------|
| `supabase/migrations/006_attendance.sql` | Create — add `attended` column to bookings |
| `app/api/bookings/[id]/attend/route.ts` | Create — PATCH endpoint to mark/unmark attendance |
| `app/api/members/attendance/route.ts` | Create — GET endpoint returning monthly attendance count per active member |
| `app/api/cron/waitlist-expire/route.ts` | Create — replaces Supabase Edge Function; expires stale `pending_confirmation` bookings and promotes next waitlisted member |
| `app/api/members/revoke/route.ts` | Modify — after batch-cancel, call `promoteNextWaitlistMember` per distinct `instance_id` from `confirmed`/`pending_confirmation` rows only |
| `app/api/members/delete/route.ts` | Modify — same as revoke |
| `app/api/bookings/confirm/[token]/route.ts` | Modify — expired path: `status → 'cancelled'` (not `'waitlisted'`), null out `waitlist_position` |
| `app/(owner)/schedule/page.tsx` | Modify — class detail panel with attendance toggles |
| `app/(owner)/members/page.tsx` | Modify — fetch from `GET /api/members/attendance`, display "X classes this month" per member |
| `vercel.json` | Create — `{ "crons": [{ "path": "/api/cron/waitlist-expire", "schedule": "*/30 * * * *" }] }` |
| `supabase/functions/process-waitlist-expiry/index.ts` | Retire — disable in Supabase dashboard (do not delete file) |

---

## Out of Scope

- Strike system or automated consequences for no-shows
- Push notifications (deferred to mobile app phase)
- Owner-configurable confirmation window (fixed at 2 hours / skip if ≤ 2h to class)
- Attendance history beyond current month on the members page
- Re-queuing expired waitlist members (they are cancelled and must re-book)
- Index on `bookings.attended` (deferred)
