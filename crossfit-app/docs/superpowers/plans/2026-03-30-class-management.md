# Class Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add attendance tracking (per-class toggle + monthly count on members page) and waitlist auto-promotion (cron expiry, promotion on cancel, confirm/expire bug fix).

**Architecture:** Nine independent tasks covering schema migration, four new/modified API routes, two bug fixes in existing routes, a Vercel cron job, and two UI updates. Tasks 1–7 are backend; Tasks 8–9 are frontend. Tasks can be done in order — later tasks build on earlier ones (Task 8 depends on Task 2; Task 9 depends on Task 3).

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (server-side + client-side), Tailwind CSS. No new dependencies.

---

## File Structure

| File | Change |
|------|--------|
| `supabase/migrations/006_attendance.sql` | Create — add `attended boolean` to bookings |
| `app/api/bookings/[id]/attend/route.ts` | Create — PATCH endpoint, owner-only, marks attendance |
| `app/api/members/attendance/route.ts` | Create — GET endpoint, monthly attended count per active member |
| `app/api/bookings/confirm/[token]/route.ts` | Modify — expired path: `status → 'cancelled'` + `waitlist_position → null` |
| `app/api/members/revoke/route.ts` | Modify — promote waitlist after bulk cancel |
| `app/api/members/delete/route.ts` | Modify — same as revoke |
| `app/api/cron/waitlist-expire/route.ts` | Create — GET cron handler; expires stale `pending_confirmation` + promotes next |
| `vercel.json` | Create — schedule cron every 30 min |
| `app/(owner)/schedule/page.tsx` | Modify — add attendance date picker + class instances + detail panel |
| `app/(owner)/members/page.tsx` | Modify — fetch monthly attendance counts, display under each member |
| `supabase/functions/process-waitlist-expiry/index.ts` | Retire — disable in Supabase dashboard before cron goes live (do not delete file) |

---

### Task 1: Migration 006 — add `attended` column

**Files:**
- Create: `supabase/migrations/006_attendance.sql`

**Background:** The `bookings` table needs a `boolean` column `attended` (nullable — `null` = unmarked, `true` = attended, `false` = no-show). No index required at this stage per spec.

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/006_attendance.sql` with this exact content:

```sql
alter table bookings add column attended boolean;
```

- [ ] **Step 2: Apply the migration to the local/remote DB**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx supabase db push
```

If using remote Supabase (likely), run the SQL directly in the Supabase Dashboard SQL editor as a fallback:
```
alter table bookings add column attended boolean;
```

- [ ] **Step 3: Commit**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && git add supabase/migrations/006_attendance.sql && git commit -m "feat: add attended column to bookings (migration 006)"
```

---

### Task 2: `PATCH /api/bookings/[id]/attend`

**Files:**
- Create: `app/api/bookings/[id]/attend/route.ts`

**Background:** Owner-only endpoint. Receives `{ attended: boolean | null }`. Cross-checks `bookings.gym_id = userData.gym_id`. Only allows marking when booking `status = 'confirmed'`. Used by the attendance UI in Task 8.

- [ ] **Step 1: Create the route file**

Create `app/api/bookings/[id]/attend/route.ts` with this exact content:

```ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { attended } = await req.json()

  if (attended !== true && attended !== false && attended !== null) {
    return NextResponse.json({ error: 'attended must be true, false, or null' }, { status: 400 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, gym_id, status')
    .eq('id', params.id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.gym_id !== userData.gym_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: 'Can only mark attendance on confirmed bookings' }, { status: 400 })
  }

  await supabase.from('bookings').update({ attended }).eq('id', params.id)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/bookings/[id]/attend/route.ts && git commit -m "feat: add PATCH /api/bookings/[id]/attend endpoint"
```

---

### Task 3: `GET /api/members/attendance`

**Files:**
- Create: `app/api/members/attendance/route.ts`

**Background:** Returns `{ attendance: { [userId]: number } }` — map of active member user IDs to count of classes attended this month. Queries bookings where `attended = true`, joined to `class_instances` where `starts_at` falls in the current calendar month (computed in the gym's timezone, converted to UTC). Only includes `role = 'member'` users with `revoked_at IS NULL`.

- [ ] **Step 1: Create the route file**

Create `app/api/members/attendance/route.ts` with this exact content:

```ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

// Returns the UTC ISO timestamp for "YYYY-MM-01 00:00:00" in the given IANA timezone.
// Uses the 2nd of the month at noon UTC as a stable reference point to compute the TZ offset,
// avoiding edge cases caused by DST transitions that occur at midnight.
function monthStartUTC(year: number, month: number, tz: string): string {
  const ref = new Date(Date.UTC(year, month - 1, 2, 12, 0, 0))
  const localStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(ref) // "YYYY-MM-DD HH:mm:ss" in local timezone
  const offsetMs = new Date(localStr.replace(' ', 'T') + 'Z').getTime() - ref.getTime()
  return new Date(Date.UTC(year, month - 1, 1) - offsetMs).toISOString()
}

export async function GET() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth

  // Fetch gym timezone
  const { data: gym } = await supabase
    .from('gyms')
    .select('timezone')
    .eq('id', userData.gym_id)
    .single()

  const timezone = gym?.timezone ?? 'UTC'

  // Determine current year/month in the gym's local timezone
  const localDateStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()) // "YYYY-MM-DD"
  const [year, month] = localDateStr.split('-').map(Number)

  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  const monthStartUTCStr = monthStartUTC(year, month, timezone)
  const monthEndUTCStr = monthStartUTC(nextYear, nextMonth, timezone)

  // Fetch active members for this gym
  const { data: members } = await supabase
    .from('users')
    .select('id')
    .eq('gym_id', userData.gym_id)
    .eq('role', 'member')
    .is('revoked_at', null)

  const memberIds = (members ?? []).map(m => m.id)

  if (memberIds.length === 0) {
    return NextResponse.json({ attendance: {} })
  }

  // Fetch attended bookings this month for active members
  const { data: bookings } = await supabase
    .from('bookings')
    .select('user_id, class_instances!inner(starts_at)')
    .eq('gym_id', userData.gym_id)
    .eq('attended', true)
    .in('user_id', memberIds)
    .gte('class_instances.starts_at', monthStartUTCStr)
    .lt('class_instances.starts_at', monthEndUTCStr)

  const attendance: Record<string, number> = {}
  for (const id of memberIds) {
    attendance[id] = 0
  }
  for (const b of bookings ?? []) {
    attendance[b.user_id] = (attendance[b.user_id] ?? 0) + 1
  }

  return NextResponse.json({ attendance })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/members/attendance/route.ts && git commit -m "feat: add GET /api/members/attendance endpoint"
```

---

### Task 4: Fix `confirm/[token]` expired path bug

**Files:**
- Modify: `app/api/bookings/confirm/[token]/route.ts:28`

**Background:** Line 28 currently sets `status: 'waitlisted'` when a confirmation token is expired. Spec requires `status: 'cancelled'` and `waitlist_position: null`. The existing `promoteNextWaitlistMember` call on line 30 is correct and stays.

- [ ] **Step 1: Apply the fix**

In `app/api/bookings/confirm/[token]/route.ts`, find the line inside the expired-path `if` block that reads:
```ts
    await supabase.from('bookings').update({ status: 'waitlisted', confirmation_token: null, confirmation_expires_at: null }).eq('id', booking.id)
```

Replace with:
```ts
    await supabase.from('bookings').update({ status: 'cancelled', confirmation_token: null, confirmation_expires_at: null, waitlist_position: null }).eq('id', booking.id)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/bookings/confirm/[token]/route.ts && git commit -m "fix: expired confirmation sets status cancelled not waitlisted"
```

---

### Task 5: Fix `revoke` route — waitlist promotion after cancel

**Files:**
- Modify: `app/api/members/revoke/route.ts`

**Background:** After batch-cancelling a member's future bookings, the route must call `promoteNextWaitlistMember` for each instance that had a `confirmed` or `pending_confirmation` booking (not `waitlisted`). The instance IDs and `starts_at` values must be captured **before** the bulk UPDATE (status info is lost after). The initial select must also fetch `instance_id` and `status`.

- [ ] **Step 1: Apply the changes**

Replace the entire `app/api/members/revoke/route.ts` with:

```ts
import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'

interface BookingWithInstance {
  id: string
  instance_id: string
  status: string
  class_instances: { starts_at: string }
}

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { memberId } = await req.json()
  const now = new Date().toISOString()

  const { data: member } = await supabase.from('users').select('email, name').eq('id', memberId).single()

  await supabase.from('users').update({ revoked_at: now }).eq('id', memberId).eq('gym_id', userData.gym_id)

  const { data: rawBookings } = await supabase.from('bookings')
    .select('id, instance_id, status, class_instances(starts_at)')
    .eq('user_id', memberId)
    .eq('gym_id', userData.gym_id)
    .in('status', ['confirmed', 'waitlisted', 'pending_confirmation'])
    .returns<BookingWithInstance[]>()

  const futureBookings = (rawBookings ?? [])
    .filter(b => new Date(b.class_instances.starts_at) > new Date())

  const futureBookingIds = futureBookings.map(b => b.id)

  // Capture instance_id + starts_at for confirmed/pending_confirmation BEFORE the bulk cancel.
  // A member can only have one booking per instance (unique constraint), so deduplication by
  // instance_id is correct — one freed spot per instance, one promotion call per instance.
  const instancesToPromote: Array<{ instanceId: string; startsAt: string }> = []
  const seenInstances = new Set<string>()
  for (const b of futureBookings) {
    if ((b.status === 'confirmed' || b.status === 'pending_confirmation') && !seenInstances.has(b.instance_id)) {
      instancesToPromote.push({ instanceId: b.instance_id, startsAt: b.class_instances.starts_at })
      seenInstances.add(b.instance_id)
    }
  }

  if (futureBookingIds.length > 0) {
    await supabase.from('bookings')
      .update({ status: 'cancelled', cancelled_at: now })
      .in('id', futureBookingIds)
  }

  // Promote waitlisted members for each freed spot
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  for (const { instanceId, startsAt } of instancesToPromote) {
    await promoteNextWaitlistMember(supabase, instanceId, startsAt, appUrl)
  }

  if (member) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'noreply@yourgym.com',
      to: member.email,
      subject: 'Your gym access has been removed',
      html: `<p>Hi ${member.name}, your access to the gym has been removed and your upcoming bookings have been cancelled.</p>`
    })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/members/revoke/route.ts && git commit -m "feat: promote waitlist after member revoke bulk-cancel"
```

---

### Task 6: Fix `delete` route — waitlist promotion after cancel

**Files:**
- Modify: `app/api/members/delete/route.ts`

**Background:** Same logic as the revoke route fix. The delete route also batch-cancels future bookings without promoting the waitlist. Apply the same pattern.

- [ ] **Step 1: Apply the changes**

Replace the entire `app/api/members/delete/route.ts` with:

```ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'

interface BookingWithInstance {
  id: string
  instance_id: string
  status: string
  class_instances: { starts_at: string }
}

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { memberId } = await req.json()
  const now = new Date().toISOString()

  // Verify member belongs to this gym
  const { data: member } = await supabase.from('users')
    .select('id').eq('id', memberId).eq('gym_id', userData.gym_id).single()
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  // Fetch all future bookings
  const { data: rawBookings } = await supabase.from('bookings')
    .select('id, instance_id, status, class_instances(starts_at)')
    .eq('user_id', memberId)
    .eq('gym_id', userData.gym_id)
    .in('status', ['confirmed', 'waitlisted', 'pending_confirmation'])
    .returns<BookingWithInstance[]>()

  const futureBookings = (rawBookings ?? [])
    .filter(b => new Date(b.class_instances.starts_at) > new Date())

  const futureBookingIds = futureBookings.map(b => b.id)

  // Capture instance_id + starts_at for confirmed/pending_confirmation BEFORE the bulk cancel.
  // A member can only have one booking per instance (unique constraint), so deduplication by
  // instance_id is correct — one freed spot per instance, one promotion call per instance.
  const instancesToPromote: Array<{ instanceId: string; startsAt: string }> = []
  const seenInstances = new Set<string>()
  for (const b of futureBookings) {
    if ((b.status === 'confirmed' || b.status === 'pending_confirmation') && !seenInstances.has(b.instance_id)) {
      instancesToPromote.push({ instanceId: b.instance_id, startsAt: b.class_instances.starts_at })
      seenInstances.add(b.instance_id)
    }
  }

  if (futureBookingIds.length > 0) {
    await supabase.from('bookings')
      .update({ status: 'cancelled', cancelled_at: now })
      .in('id', futureBookingIds)
  }

  // Promote waitlisted members for each freed spot
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  for (const { instanceId, startsAt } of instancesToPromote) {
    await promoteNextWaitlistMember(supabase, instanceId, startsAt, appUrl)
  }

  // Delete user row
  await supabase.from('users').delete().eq('id', memberId).eq('gym_id', userData.gym_id)

  // Delete from Supabase Auth
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  await adminSupabase.auth.admin.deleteUser(memberId)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/members/delete/route.ts && git commit -m "feat: promote waitlist after member delete bulk-cancel"
```

---

### Task 7: Cron job + `vercel.json`

**Files:**
- Create: `app/api/cron/waitlist-expire/route.ts`
- Create: `vercel.json`

**Background:** Vercel cron jobs use GET handlers. The cron must be secured with `CRON_SECRET` header check. It finds all `pending_confirmation` bookings where `confirmation_expires_at < now()`, sets each to `cancelled` (with `confirmation_token → null`, `confirmation_expires_at → null`, `waitlist_position → null`), then calls `promoteNextWaitlistMember` for each. Multiple expirations for the same `instance_id` are processed independently (each freed a real spot). The Supabase Edge Function `supabase/functions/process-waitlist-expiry/index.ts` must be **disabled in the Supabase dashboard** before this cron goes live to prevent double-processing.

- [ ] **Step 1: Create the cron route**

Create `app/api/cron/waitlist-expire/route.ts` with this exact content:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'

interface ExpiredBooking {
  id: string
  instance_id: string
  class_instances: { starts_at: string }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const now = new Date().toISOString()

  const { data: expired } = await supabase
    .from('bookings')
    .select('id, instance_id, class_instances(starts_at)')
    .eq('status', 'pending_confirmation')
    .lt('confirmation_expires_at', now)
    .returns<ExpiredBooking[]>()

  if (!expired || expired.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  let processed = 0

  for (const booking of expired) {
    await supabase.from('bookings').update({
      status: 'cancelled',
      confirmation_token: null,
      confirmation_expires_at: null,
      waitlist_position: null,
    }).eq('id', booking.id)

    await promoteNextWaitlistMember(
      supabase,
      booking.instance_id,
      booking.class_instances.starts_at,
      appUrl
    )

    processed++
  }

  return NextResponse.json({ processed })
}
```

- [ ] **Step 2: Create `vercel.json`**

Create `vercel.json` at the project root with this exact content:

```json
{
  "crons": [
    {
      "path": "/api/cron/waitlist-expire",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx tsc --noEmit
```

- [ ] **Step 4: Add `CRON_SECRET` to Vercel env (if not already set)**

```bash
echo "your-cron-secret-here" | vercel env add CRON_SECRET production
echo "your-cron-secret-here" | vercel env add CRON_SECRET preview
```

Also add to `.env.local`:
```
CRON_SECRET=your-cron-secret-here
```

Use a secure random string (e.g., `openssl rand -hex 32`).

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/waitlist-expire/route.ts vercel.json && git commit -m "feat: add Vercel cron job to expire stale pending_confirmation bookings"
```

- [ ] **Step 6: ⚠️ Manual action required — disable Supabase Edge Function**

Before deploying to production, the owner must disable `process-waitlist-expiry` in the Supabase Dashboard:
> Supabase Dashboard → Edge Functions → `process-waitlist-expiry` → Disable (or Delete)

Running both simultaneously causes double-processing (double-promotion, double-emails).

---

### Task 8: Attendance UI in owner schedule page

**Files:**
- Modify: `app/(owner)/schedule/page.tsx`

**Background:** The schedule page is `'use client'`. Add an "Attendance" section below the existing schedule grid. The owner picks a date (defaulting to today). Class instances for that date are loaded from Supabase client. Clicking an instance shows a detail panel with confirmed bookings and a three-state attendance toggle (null → true → false → null). The toggle calls `PATCH /api/bookings/[id]/attend`.

The Supabase client can read class instances and bookings via RLS (`gym members read instances`, `owner sees all bookings`). The gym_id is fetched by querying `users` table (same pattern as the members page).

- [ ] **Step 1: Write the new schedule page**

Replace the entire `app/(owner)/schedule/page.tsx` with:

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { ScheduleTemplate, ScheduleDefaults } from '@/lib/types'
import { CapacityDefaults } from '@/components/schedule/capacity-defaults'
import { ScheduleGrid } from '@/components/schedule/schedule-grid'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'

interface ClassInstance {
  id: string
  date: string
  local_time: string
  starts_at: string
  capacity: number
}

interface BookingForAttendance {
  id: string
  attended: boolean | null
  users: { id: string; name: string; email: string }
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function AttendanceToggle({
  attended,
  onChange,
}: {
  attended: boolean | null
  onChange: (v: boolean | null) => void
}) {
  const next = attended === null ? true : attended === true ? false : null
  const label = attended === null ? 'Unmarked' : attended ? 'Attended' : 'No-show'
  const colorClass =
    attended === null
      ? 'text-secondary border-accent-border hover:border-accent'
      : attended
      ? 'text-green-400 border-green-400'
      : 'text-danger border-danger'

  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className={`text-xs border rounded-btn px-2 py-1 transition-colors ${colorClass}`}
    >
      {label}
    </button>
  )
}

export default function SchedulePage() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [defaults, setDefaults] = useState<ScheduleDefaults>({
    globalDefault: 20,
    dayDefaults: {},
  })
  const [loading, setLoading] = useState(true)

  // Attendance state
  const [gymId, setGymId] = useState<string | null>(null)
  const [attendanceDate, setAttendanceDate] = useState(todayISO())
  const [instancesForDate, setInstancesForDate] = useState<ClassInstance[]>([])
  const [instancesLoading, setInstancesLoading] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<ClassInstance | null>(null)
  const [bookingsForInstance, setBookingsForInstance] = useState<BookingForAttendance[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/schedule/templates')
      const data = await res.json()
      setTemplates(data.templates ?? [])
      setDefaults({
        globalDefault: data.globalDefault ?? 20,
        dayDefaults: data.dayDefaults ?? {},
      })
      setLoading(false)

      // Also fetch gym_id for attendance queries
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('gym_id')
          .eq('id', user.id)
          .single()
        if (userData) setGymId((userData as { gym_id: string }).gym_id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load()
  }, [])

  const loadInstancesForDate = useCallback(async (date: string, gid: string) => {
    setInstancesLoading(true)
    setSelectedInstance(null)
    setBookingsForInstance([])
    const { data } = await supabase
      .from('class_instances')
      .select('id, date, local_time, starts_at, capacity')
      .eq('gym_id', gid)
      .eq('date', date)
      .order('local_time')
    setInstancesForDate((data ?? []) as ClassInstance[])
    setInstancesLoading(false)
  }, [supabase])

  useEffect(() => {
    if (gymId) loadInstancesForDate(attendanceDate, gymId)
  }, [attendanceDate, gymId, loadInstancesForDate])

  async function loadBookingsForInstance(instanceId: string) {
    setBookingsLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('id, attended, users(id, name, email)')
      .eq('instance_id', instanceId)
      .eq('status', 'confirmed')
    setBookingsForInstance((data ?? []) as unknown as BookingForAttendance[])
    setBookingsLoading(false)
  }

  async function handleAttendanceToggle(bookingId: string, newValue: boolean | null) {
    await fetch(`/api/bookings/${bookingId}/attend`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attended: newValue }),
    })
    setBookingsForInstance(prev =>
      prev.map(b => b.id === bookingId ? { ...b, attended: newValue } : b)
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-400 text-sm">Loading schedule...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Class Schedule</h1>
        <p className="text-sm text-yellow-400">↻ This schedule repeats every week automatically</p>
      </div>

      <CapacityDefaults defaults={defaults} onUpdate={setDefaults} />

      <ScheduleGrid
        initialTemplates={templates}
        defaults={defaults}
      />

      {/* Attendance Section */}
      <div className="mt-10">
        <h2 className="font-display text-xl text-white mb-4">Class Attendance</h2>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-secondary text-sm">Date</label>
          <input
            type="date"
            value={attendanceDate}
            onChange={e => setAttendanceDate(e.target.value)}
            className="bg-background border border-accent-border rounded-btn px-3 py-1.5 text-white text-sm focus:outline-none focus:border-accent"
          />
        </div>

        {instancesLoading && (
          <p className="text-secondary text-sm">Loading classes...</p>
        )}
        {!instancesLoading && instancesForDate.length === 0 && (
          <p className="text-secondary text-sm">No classes scheduled for this date.</p>
        )}

        <div className="space-y-2 mb-6">
          {instancesForDate.map(inst => (
            <Card
              key={inst.id}
              className={`cursor-pointer transition-colors ${
                selectedInstance?.id === inst.id
                  ? 'border-accent'
                  : 'hover:border-accent/50'
              }`}
              onClick={() => {
                setSelectedInstance(inst)
                loadBookingsForInstance(inst.id)
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">{inst.local_time}</span>
                <span className="text-secondary text-xs">Cap {inst.capacity}</span>
              </div>
            </Card>
          ))}
        </div>

        {selectedInstance && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">
                {selectedInstance.local_time} — Bookings
              </h3>
              <button
                type="button"
                onClick={() => { setSelectedInstance(null); setBookingsForInstance([]) }}
                className="text-secondary text-xs hover:text-white"
              >
                Close
              </button>
            </div>

            {bookingsLoading && (
              <p className="text-secondary text-sm">Loading bookings...</p>
            )}
            {!bookingsLoading && bookingsForInstance.length === 0 && (
              <p className="text-secondary text-sm">No confirmed bookings for this class.</p>
            )}
            <div className="space-y-2">
              {bookingsForInstance.map(b => (
                <Card key={b.id} className="flex items-center justify-between">
                  <p className="text-white text-sm">
                    {b.users.name || b.users.email}
                  </p>
                  <AttendanceToggle
                    attended={b.attended}
                    onChange={v => handleAttendanceToggle(b.id, v)}
                  />
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(owner)/schedule/page.tsx && git commit -m "feat: add attendance section to owner schedule page"
```

---

### Task 9: Members page — display monthly attendance count

**Files:**
- Modify: `app/(owner)/members/page.tsx`

**Background:** The members page is `'use client'`. After loading members, fetch `GET /api/members/attendance` and store the result in state. Display "X classes this month" below each member's email. Revoked members show "0 classes this month" (they are excluded from the attendance map, so defaulting to 0 is correct).

- [ ] **Step 1: Write the updated members page**

Replace the entire `app/(owner)/members/page.tsx` with:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Card } from '@/components/ui/card'

interface MemberRow { id: string; email: string; name: string; created_at: string; revoked_at: string | null }
interface GymUserRow { gym_id: string }

export default function MembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({})
  const [inviteEmail, setInviteEmail] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState('')
  const supabase = createClient()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMembers() }, [])

  async function loadMembers() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
    const gymUser = userData as unknown as GymUserRow | null
    const { data } = await supabase.from('users').select('id, email, name, created_at, revoked_at')
      .eq('gym_id', gymUser!.gym_id).eq('role', 'member').order('created_at')
    setMembers((data ?? []) as unknown as MemberRow[])

    const res = await fetch('/api/members/attendance')
    if (res.ok) {
      const json = await res.json()
      setAttendanceCounts(json.attendance ?? {})
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    const res = await fetch('/api/members/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) })
    const data = await res.json()
    if (!res.ok) { setInviteError(data.error ?? 'Failed to send invite'); return }
    setInviteEmail('')
    await loadMembers()
  }

  async function handleRevoke() {
    await fetch('/api/members/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: revokeTarget }) })
    setRevokeTarget(null)
    await loadMembers()
  }

  async function handleDelete() {
    await fetch('/api/members/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: deleteTarget }) })
    setDeleteTarget(null)
    await loadMembers()
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">Members</h1>
      <Card className="mb-6">
        <h2 className="text-white font-semibold mb-3">Invite Member</h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            placeholder="member@email.com" required
            className="flex-1 px-3 py-2 bg-background border border-accent-border rounded-btn text-white placeholder-secondary focus:outline-none focus:border-accent"
          />
          <Button type="submit">Send Invite</Button>
        </form>
        {inviteError && <p className="text-danger text-xs mt-2">{inviteError}</p>}
      </Card>

      <div className="space-y-2">
        {members.map(m => (
          <Card key={m.id} className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">{m.email}</p>
              <p className="text-secondary text-xs">
                {attendanceCounts[m.id] ?? 0} classes this month
              </p>
              {m.revoked_at && <p className="text-danger text-xs">Revoked</p>}
            </div>
            <div className="flex items-center gap-2">
              {m.revoked_at ? (
                <Button onClick={async () => {
                  await fetch('/api/members/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: m.id }) })
                  await loadMembers()
                }}>Restore</Button>
              ) : (
                <Button variant="danger" onClick={() => setRevokeTarget(m.id)}>Revoke</Button>
              )}
              <Button variant="danger" onClick={() => setDeleteTarget(m.id)}>Delete</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!revokeTarget}
        title="Revoke Member Access?"
        description="This will cancel all their future bookings and they will no longer be able to log in."
        confirmLabel="Revoke Access"
        confirmVariant="danger"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
      <Modal
        open={!!deleteTarget}
        title="Delete Member?"
        description="This will permanently delete the member and cancel all their future bookings. This cannot be undone."
        confirmLabel="Delete Member"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

Open `/members` as an owner. Check:
- [ ] Each member card shows "X classes this month"
- [ ] The count is 0 for members with no attended bookings
- [ ] Revoked members still show (with their count showing 0 — they are excluded from the attendance map)

- [ ] **Step 4: Commit**

```bash
git add app/(owner)/members/page.tsx && git commit -m "feat: show monthly attendance count on members page"
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Ensure `CRON_SECRET` is set in Vercel (production + preview)
- [ ] Ensure `NEXT_PUBLIC_APP_URL` is set to the production URL (already done in a prior fix)
- [ ] **Disable `process-waitlist-expiry` Supabase Edge Function** — Supabase Dashboard → Edge Functions → disable `process-waitlist-expiry` — do this before the new Vercel cron goes live
- [ ] Run `vercel --prod` to deploy

After deployment:
- [ ] Confirm cron job appears in Vercel dashboard (Project → Settings → Cron Jobs)
- [ ] Test attendance toggle in production on a confirmed booking
- [ ] Confirm members page shows attendance counts
