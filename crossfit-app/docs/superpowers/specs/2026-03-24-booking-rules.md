# Booking Rules — Design Spec
**Date:** 2026-03-24

## Overview
Two booking improvements:
1. **2-day advance booking window** — members can only book a class within 2 days of it starting
2. **Capacity editing** — owners can edit the capacity of existing class slot templates

---

## Part 1: 2-Day Advance Booking Window

### API Enforcement (`app/api/bookings/route.ts`)
In the POST handler, after fetching the class instance, add:
```ts
const twoDaysFromNow = Date.now() + 2 * 24 * 60 * 60 * 1000
if (new Date(instance.starts_at).getTime() > twoDaysFromNow) {
  return NextResponse.json(
    { error: 'Bookings open 2 days before class', opensAt: new Date(new Date(instance.starts_at).getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { status: 400 }
  )
}
```

### Member UI (`components/booking/class-slot.tsx`)
- Read the existing `ClassSlot` component to understand current booking button logic
- If a class is more than 2 days away, replace the booking button with a muted label: "Opens [weekday] at [time]"
  - Calculate `opensAt = starts_at - 2 days`
  - Format: "Opens Monday at 6:00am"
- This is a client-side check (same logic as API) to avoid unnecessary API calls
- Do not change cancel logic

---

## Part 2: Capacity Editing on Existing Templates

### API (`app/api/schedule/templates/route.ts`)
Add a `PATCH` handler:
- Auth: owner only (same pattern as existing POST/DELETE)
- Body: `{ id: string, capacity: number }`
- Validates `capacity >= 1 && capacity <= 200`
- Updates `capacity` on `class_slot_templates` where `id` matches and `gym_id` matches owner's gym
- Returns updated template

### Schedule UI (`app/(owner)/schedule/page.tsx`)
- Each template row currently shows: `[Day] at [time] — [capacity] spots` + Remove button
- Add inline capacity editing:
  - Display capacity as a clickable number
  - On click: replace with a small number input (width ~60px) pre-filled with current value + a checkmark button to save
  - On save: call `PATCH /api/schedule/templates` with `{ id, capacity }`
  - On success: update local state, return to display mode
  - On cancel (press Escape or click away): discard changes, return to display mode
  - Show inline error if save fails

## Constraints
- Do not change the `class_slot_templates` or `class_instances` schema
- The 2-day window is hardcoded (not configurable per gym) — keep it simple for now
- Use existing Tailwind tokens only
- Do not change owner-facing schedule management beyond capacity editing
