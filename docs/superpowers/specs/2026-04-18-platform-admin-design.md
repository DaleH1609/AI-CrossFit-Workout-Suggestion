# Platform Admin Panel Design

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A platform-level admin panel at `/admin` giving the site owner full visibility into all gyms, members, bookings, and class instances — the primary tool for debugging support issues and tracking growth.

**Architecture:** New `(admin)` route group. Data fetching in Server Components using Supabase service role client. Mutations via Next.js Server Actions (CSRF-protected by framework when invoked via form/action bindings — not raw fetch). Same visual design as owner panel.

**Tech Stack:** Next.js 14 App Router, Supabase service role client, Server Actions for mutations, Tailwind CSS, existing UI components.

---

## Auth & Access

### Env var
`ADMIN_EMAILS=you@example.com,colleague@example.com` — comma-separated. Set in Vercel environment variables. Server-side only, never referenced in client components.

**Fail-closed rule:** If `ADMIN_EMAILS` is missing or empty, all `/admin/*` requests are denied. No silent permit-all.

**Known limitation:** Changing admin access requires a redeployment to take effect. `process.env.ADMIN_EMAILS` is read at call-time (not cached at module load) so rotation takes effect immediately after redeploy. This is an accepted trade-off for a solo-founder stage product.

### Middleware (`middleware.ts`)
The existing middleware matcher `/((?!_next/static|_next/image|favicon.ico|api).*)` already covers `/admin/*` — **the matcher pattern does not change**. Only the handler logic inside the middleware function is extended with an `/admin` branch:
1. Confirm the request has a valid Supabase session
2. Confirm `session.user.email` is in the `ADMIN_EMAILS` list
3. If either check fails → redirect to `/login`

A logged-in gym owner who navigates to `/admin` is blocked at step 2.

### Layout-level server check (`app/(admin)/layout.tsx`)
Defence in depth: the admin layout also calls `requireAdminAuth()` server-side. Catches any case where middleware is bypassed.

### `requireAdminAuth()` (`lib/auth-helpers.ts`)
```ts
export async function requireAdminAuth(): Promise<{ user: User }>
```
- Reads the Supabase session server-side
- Splits `process.env.ADMIN_EMAILS` by comma at call-time (not cached)
- If email not in list or no session → `redirect('/login')`
- No DB query — identity lives entirely in the env var

---

## Routes & Pages

All pages are Server Components. Data fetched directly using the service role admin client (no separate API routes needed).

### `/admin` — Overview (`app/(admin)/page.tsx`)

**Stats cards (4):**
- Total gyms (all time count + count joined in last 7 days)
- Total members (all time + last 7 days)
- Total bookings (all time + last 7 days)
- Total workout weeks generated — `count(*) on workout_weeks` all time

**Recently joined gyms table (10 rows):**
Columns: gym name, owner email, type badge (CrossFit/Hyrox), member count, joined date.
Each row links to `/admin/gyms/[gymId]`.

Query: join `gyms` + `count(users where gym_id = gyms.id)`, order by `gyms.created_at desc`, limit 10.

### `/admin/gyms` — Gym List (`app/(admin)/gyms/page.tsx`)

Full table of all gyms. Capped at **500 rows** on initial fetch — if gym count exceeds 500, server-side pagination will be added (out of scope for now, cap prevents runaway payload). Client-side search filter on gym name and owner email within those 500 rows.

**Columns fetched (explicit — do not use SELECT \*):**
`gyms.id`, `gyms.name`, `gyms.gym_type`, `gyms.created_at`, `gyms.suspended_at`
`owner email` — from joined `users` where `users.id = gyms.owner_id`
`member_count` — `count(users where gym_id = gyms.id)`
`booking_count` — `count(bookings where gym_id = gyms.id)`
`last_active` — `max(bookings.created_at)` for that gym. Falls back to `gyms.created_at` if no bookings. Measures booking activity, not logins. Shown as relative time ("2d ago").

**Displayed columns:** Gym name (link), owner email, type badge, member count, total bookings, last active, joined date.

### `/admin/gyms/[gymId]` — Gym Detail (`app/(admin)/gyms/[gymId]/page.tsx`)

Four sections:

**1. Gym Info**
Name, owner email, type, timezone, created date. Quick stats: member count (active / revoked), total booking count, workout weeks generated.

**2. Booking Health**
- Bookings this week (Mon–Sun, gym's local timezone)
- Avg class fill rate this week: `sum(confirmed bookings) / sum(capacity)` across all instances this week, as a percentage
- Cancellation rate this week: `count(cancelled) / count(all bookings this week)`
- Upcoming class instances (next 7 days): table with date, local time, class name, booked / capacity
- If no upcoming instances → warning banner: "No upcoming class instances. Check schedule templates and cron."

**3. Members**
Full member list: name, email, role badge, joined date, revoked badge if revoked.
Each member row has an inline expand toggle (accordion — no modal) showing that member's last 5 bookings: class name, date, status badge (confirmed / waitlisted / cancelled / pending).

**4. Danger Zone**
Two Server Actions in `app/(admin)/gyms/[gymId]/actions.ts`:

**Each Server Action independently calls `requireAdminAuth()` at the top** — Server Actions are not protected by the layout guard automatically. This is the primary authorization check for mutations.

**Service role client:** Both Server Actions use the Supabase service role client (same `SUPABASE_SERVICE_ROLE_KEY` already in env vars). This bypasses RLS for the write, which is appropriate since admin identity is verified by `requireAdminAuth()` above.

- **Suspend Gym** — sets `gyms.suspended_at = now()`. Requires a checkbox confirmation before the button activates. Reversible — an "Unsuspend" button appears when `suspended_at` is set. Logs to `admin_audit_log` after success.
- **Delete Gym** — hard deletes the gym row. All child rows cascade automatically via existing `ON DELETE CASCADE` FK constraints (confirmed in migration 001). Requires typing the exact gym name into an input field before the button activates. Logs to `admin_audit_log` **after** the delete succeeds — if the delete fails, no log entry is written (clean audit trail, accepted trade-off over a full transaction).

### `/admin/users` — User Lookup (`app/(admin)/users/page.tsx`)

Server-side search: URL query param `?q=email`, rerenders the page with results. Searches `users.email ilike '%q%'`. No results if query is empty.

Results table: name, email, role badge, gym name (linked to gym detail), joined date, revoked badge.
Each row expands inline (accordion) to show last 10 bookings: class name, date, status.

Read-only. No edit or delete actions.

---

## Suspension Scope

**Suspension only locks out the gym owner — not members.** Members of a suspended gym can still log in, view the schedule, and make bookings. This is intentional: suspension is an administrative action against the gym owner account (e.g., non-payment), not a shutdown of the gym's member-facing service.

`requireMemberAuth()` does **not** check `suspended_at` — this is explicit and intentional. The suspension check runs only in `requireOwnerAuth()`. If a full shutdown of member access is needed, use Delete instead.

### Implementation
`requireOwnerAuth()` is extended:
1. After fetching `userData` (which includes `gym_id`), fetch `SELECT suspended_at FROM gyms WHERE id = userData.gym_id`
2. If `suspended_at` is non-null → `return NextResponse.redirect('/suspended')`

New page: `app/suspended/page.tsx` — static, publicly accessible without auth (owner may not be able to complete auth flow if redirect fires). Content:
> "Your gym account has been suspended. Please contact support at [support email from env var `SUPPORT_EMAIL`, fallback: 'support'] to resolve this."

---

## Audit Logging

New table `admin_audit_log`:
```sql
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,         -- 'suspend_gym' | 'unsuspend_gym' | 'delete_gym'
  target_id uuid,
  target_name text,
  created_at timestamptz not null default now()
);
```

Written before every Danger Zone action via service role client. No retention policy — table is append-only. At current scale (very low admin action volume) this is fine indefinitely.

---

## DB Migration (`supabase/migrations/017_admin.sql`)

```sql
alter table gyms add column if not exists suspended_at timestamptz;

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target_id uuid,
  target_name text,
  created_at timestamptz not null default now()
);
```

No FK cascade changes needed — existing `ON DELETE CASCADE` constraints handle gym deletion cleanly.

---

## Navigation

New `AdminSidebar` (`components/layout/admin-sidebar.tsx`), mirroring `OwnerSidebar`:
- Kova logo
- "PLATFORM ADMIN" label (small caps, visually distinct from owner panel)
- Nav items: Overview (`/admin`), Gyms (`/admin/gyms`), User Lookup (`/admin/users`)
- Footer: "← Back to app" → `/dashboard`
- Same hover-expand behaviour as `OwnerSidebar`

---

## File Structure

```
app/
  (admin)/
    layout.tsx                          # requireAdminAuth() + AdminSidebar
    page.tsx                            # /admin — overview stats + recent gyms
    gyms/
      page.tsx                          # /admin/gyms — gym list (capped 500)
      [gymId]/
        page.tsx                        # /admin/gyms/[gymId] — gym detail
        actions.ts                      # Server Actions: suspend, unsuspend, delete
    users/
      page.tsx                          # /admin/users — user search

  suspended/
    page.tsx                            # public page for suspended gym owners

components/layout/
  admin-sidebar.tsx

lib/
  auth-helpers.ts                       # add requireAdminAuth()

supabase/migrations/
  017_admin.sql                         # suspended_at + admin_audit_log
```

**Route group note:** `(admin)` does not appear in the URL. `app/(admin)/page.tsx` → `/admin`. `app/(admin)/gyms/page.tsx` → `/admin/gyms`. Correct.

---

## Out of Scope

- Billing / subscription management
- Feature flags per gym
- Email delivery log (use Resend dashboard)
- Impersonating gym owners
- Editing any data from admin panel (read-only except danger zone)
- Server-side pagination on gym list (add when >500 gyms)
- Admin audit log retention / purge
