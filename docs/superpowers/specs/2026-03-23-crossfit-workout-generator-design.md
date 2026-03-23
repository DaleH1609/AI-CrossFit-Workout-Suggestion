# CrossFit Workout Generator — Design Spec
**Date:** 2026-03-23
**Stack:** Next.js + Supabase + Claude API
**Reference UI:** Wodify (high-end, premium aesthetic)

---

## Overview

A web application that allows CrossFit gym owners to generate AI-powered weekly workout programs in their own coaching style, and allows gym members to view those workouts and book into class slots with full waitlist support.

---

## User Roles

### Gym Owner (Admin)
- One owner account per gym (self-serve signup via email/password)
- Onboarding: pastes a minimum of 3 example workouts (recommended 4–7) to establish the gym's style profile
- Generates, reviews, and approves weekly workout programs before they go live
- Manages class schedule templates, capacity, and member invitations
- Can start a new program (resets history and style profile), with safeguards for live bookings

### Member (Athlete)
- Invited by gym owner via email invite link (owner enters member email addresses individually; member receives a setup link to create their password)
- Views published weekly workout schedule
- Books class slots, cancels bookings, joins waitlists
- Receives email notifications (booking confirmations, waitlist promotions, published workouts)
- Read-only — cannot edit any content
- Owner can revoke member access; revoked members' future bookings are cancelled and the member is notified by email

Row-level security in Supabase scopes all queries by `gym_id`. All tables include a `gym_id` foreign key so the schema supports multiple gyms from day one (multi-gym owner accounts remain out of scope for v1 but the database is future-proof).

---

## Authentication

- **Method:** Email/password (Supabase Auth)
- **Owner signup:** Self-serve at `/signup` — creates a `gym` record and an `owner` role user in one flow
- **Member signup:** Via invite link — owner enters email in dashboard, Supabase sends a magic-link invite; member sets password on first visit
- **Role assignment:** Stored in a `role` column on the `users` table (`owner` | `member`). Post-login, the app reads this role to render the correct dashboard view.
- No OAuth for v1.

---

## Workout Structure (Output Format)

All workouts — both example inputs and AI-generated outputs — are stored and rendered using the following JSON schema:

```json
{
  "day": "Monday",
  "parts": [
    {
      "label": "Part A",
      "type": "strength",
      "content": "Romanian Deadlift"
    },
    {
      "label": "Part B",
      "type": "interval",
      "content": "500m Row / 10 Clean and Jerk — 2 rounds\nRest at minute 7\nAt minute 9: 1000m Bike / 10 Clean and Jerks — 2 rounds\nFinish at 16 mins"
    }
  ]
}
```

- `type` values: `strength` | `interval` | `amrap` | `fortime` | `partner` | `emom` | `rest`
- `content` is a markdown-formatted string for flexible rendering
- A week is an array of 5 day objects (Mon–Fri)
- Claude is prompted to return a JSON array matching this schema — output is validated before saving

---

## AI Workout Generation

### Onboarding
Owner pastes example workouts (free text) into a text area. The system stores them as raw text in the `style_examples` table. A minimum of 3 examples is required before generation is enabled.

### Generation Flow
1. Owner clicks **"Generate This Week"** on the dashboard
2. System constructs a Claude API prompt containing:
   - The gym's style examples (raw text)
   - Up to 4 weeks of previously approved workouts (JSON, oldest first) — for progressive programming context
   - Output schema instructions (JSON array of day objects as defined above)
   - A constraint: do not repeat the same primary movement on back-to-back days
3. Claude returns a JSON array of 5 day objects
4. System validates the JSON structure; if invalid, retries once automatically; if still invalid, shows an error and prompts the owner to try again
5. Generated week is saved with status `draft` — visible only to the owner
6. Owner reviews the draft week in the dashboard
7. Owner can:
   - **Approve & Publish** — status changes to `published`; all gym members receive a "workouts are live" email immediately
   - **Regenerate** — discards the current draft and triggers a new generation (no history change)
   - **Discard** — deletes the draft without publishing
8. Published workouts from previous weeks remain visible to members (archived view)

### Week 1–3 Edge Cases
- **Week 1 (no history):** Generation uses style examples only — no progressive context
- **Weeks 2–3:** Uses all available weeks (1 or 2) as context — no padding required
- **After "Start New Program":** Treated as Week 1 — style examples reset, history cleared. The history query filters on `archived_at IS NULL` so archived workout weeks from the previous program are excluded from the generation context.

### Token Budget
- Style examples: capped at 2,000 tokens
- History context: capped at 4 weeks × ~500 tokens/week = ~2,000 tokens
- Total prompt budget: ~5,000 tokens input, leaving ample room within Claude's context window

### New Program
Owner clicks **"Start New Program"** — a confirmation modal explains:
- Current style examples will be replaced
- Programming history will be archived (not deleted — soft delete via `archived_at` timestamp)
- **Future bookings are not affected** — published workouts for upcoming weeks remain visible until their date passes
- Owner must re-paste new example workouts before generating again

---

## Class Booking System

### Timezone
- Owner sets their gym's timezone during onboarding (IANA timezone string, e.g. `America/New_York`)
- All class times are stored in UTC, displayed in the gym's local timezone for both owner and members

### Class Schedule Templates (Owner)
- Owner defines a recurring weekly schedule: a set of `(day_of_week, local_time, capacity)` entries — e.g. Mon/Wed/Fri at 6:00am, 9:00am, 5:00pm, 6:00pm — capacity 20
- The system auto-generates concrete `class_instances` records rolling 4 weeks ahead (a background job runs nightly to create upcoming instances)
- Owner can override capacity for a specific instance without changing the template
- If owner reduces an instance's capacity below current booking count, existing bookings are preserved and a warning is shown; no automatic cancellations

### Member Booking
- Members view the weekly schedule: one workout card per day + class time slots beneath it
- Each slot shows: time, spots remaining (e.g. "4 of 20 remaining"), and a Book button
- Members can book up to 2 weeks in advance
- Confirmed bookings appear in "My Schedule"
- Members can cancel up to 1 hour before class start time

### Waitlist
- When a class is full, the Book button becomes "Join Waitlist"
- Waitlist is ordered first-come-first-served
- When a cancellation occurs:
  1. System checks whether the class `starts_at` is more than 2 hours away
     - If the class starts within 2 hours, skip promotion and open the spot immediately for general booking
     - If more than 2 hours remain, proceed with promotion
  2. Next waitlisted member is promoted to `pending_confirmation` status
  3. They receive an email with a **confirmation link** (valid for **2 hours**, or until class start if sooner)
  4. If they confirm within the window, their booking becomes `confirmed`
  5. If the window expires without confirmation, the spot passes to the next waitlist member; same 2-hour check applies
  6. After exhausting the waitlist, the spot opens for general booking
- Maximum waitlist size: 10 per class slot (configurable per gym)

### Owner Class Roster View
- Owner sees each class instance: list of confirmed bookings + waitlist queue
- Read-only in v1

---

## Data Model

### `gyms`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | Gym display name |
| timezone | text | IANA timezone string |
| owner_id | uuid FK → users.id | |
| created_at | timestamptz | |

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | Matches Supabase Auth UID |
| gym_id | uuid FK → gyms.id | |
| email | text | |
| name | text | |
| role | text | `owner` or `member` |
| created_at | timestamptz | |
| revoked_at | timestamptz | Null if active |

### `style_examples`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| gym_id | uuid FK → gyms.id | |
| raw_text | text | Free-form pasted workout text |
| created_at | timestamptz | |
| archived_at | timestamptz | Set on "Start New Program" |

### `workout_weeks`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| gym_id | uuid FK → gyms.id | |
| week_start | date | Always a Monday |
| workouts | jsonb | Array of 5 day objects (Mon–Fri) |
| status | text | `draft` \| `published` \| `discarded` |
| archived_at | timestamptz | Set on "Start New Program" |
| created_at | timestamptz | |
| published_at | timestamptz | |

### `class_slot_templates`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| gym_id | uuid FK → gyms.id | |
| day_of_week | int | 1=Mon … 7=Sun |
| local_time | time | Stored as local time; rendered with gym timezone |
| capacity | int | Default max attendees |
| active | boolean | Whether this template is still in use |

### `class_instances`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| gym_id | uuid FK → gyms.id | |
| template_id | uuid FK → class_slot_templates.id | |
| date | date | Specific calendar date |
| local_time | time | May differ from template if overridden |
| starts_at | timestamptz | UTC anchor: derived from `date` + `local_time` + gym timezone at creation time; DST-safe; used for all deadline calculations (1h cancellation cutoff, waitlist 2h window, reminder emails) |
| capacity | int | May differ from template if overridden |

### `bookings`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| gym_id | uuid FK → gyms.id | |
| instance_id | uuid FK → class_instances.id | |
| user_id | uuid FK → users.id | |
| status | text | `confirmed` \| `waitlisted` \| `pending_confirmation` \| `cancelled` |
| waitlist_position | int | Null if not waitlisted |
| confirmation_token | uuid | Used in waitlist confirmation email link |
| confirmation_expires_at | timestamptz | Null unless `pending_confirmation` |
| created_at | timestamptz | |
| cancelled_at | timestamptz | |

---

## Email Notifications

All emails sent via **Resend**. On delivery failure, Resend retries up to 3 times automatically. Silent failure is acceptable for v1 (no in-app fallback).

| Trigger | Recipient | Notes |
|---|---|---|
| Member invited | Member | Contains magic link to set password |
| Booking confirmed | Member | Class date, time, workout summary |
| Booking cancelled (by member) | Member | Confirmation of cancellation |
| Member access revoked | Member | Future bookings cancelled |
| Waitlist spot available (pending confirmation) | Next waitlisted member | Includes confirmation link, 2-hour expiry |
| Workouts published for the week | All active gym members | Sent immediately on owner approval |
| Reminder: class in 1 hour | Booked members | Sent via Supabase scheduled edge function |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password + invite magic links) |
| AI | Claude API (`claude-sonnet-4-6`) |
| Email | Resend |
| Background Jobs | Supabase Edge Functions (cron: nightly class instance generation, waitlist expiry checks) |
| Hosting | Vercel |
| Secrets | Vercel environment variables (Claude API key, Supabase service role key, Resend API key) — separate staging and production environments |

---

## UI & Design

### Design Tokens

| Token | Value |
|---|---|
| Background | `#0A0A0A` |
| Surface | `#141414` |
| Border | `rgba(212, 175, 55, 0.2)` (gold, 20% opacity) |
| Accent | `#D4AF37` (gold) |
| Text primary | `#FFFFFF` |
| Text secondary | `#9CA3AF` |
| Danger | `#EF4444` |
| Font — Display | Playfair Display (serif) |
| Font — Body | Inter (sans-serif) |
| Border radius | 8px cards, 4px buttons |

### Components
- **Workout Card:** Glassmorphism — `#141414` background, `backdrop-filter: blur(12px)`, gold border, day label in Playfair Display
- **Buttons:** Outlined gold border, white text; on hover — gold fill, black text
- **Skeleton Loaders:** Shimmer animation on all async content
- **Modals:** Confirm destructive actions (regenerate, new program, revoke member)
- **Tables:** Member list, class roster — minimal, monospace secondary font for data

### Gym Owner Dashboard — Pages
1. **Weekly Program** — Mon–Fri workout cards in a 5-column grid; Generate / Approve & Publish / Regenerate / Discard buttons; status badge (Draft / Published)
2. **Style Profile** — Paste / view example workouts; Start New Program button (confirmation modal)
3. **Class Schedule** — Manage recurring templates + view upcoming instances and rosters
4. **Members** — List of members, invite by email, revoke access
5. **Settings** — Gym name, timezone, class defaults

### Member Dashboard — Pages
1. **This Week** — Workout cards Mon–Fri, each with class time slots and Book / Join Waitlist buttons
2. **My Schedule** — List of upcoming confirmed bookings with Cancel button
3. **Profile** — Name, email, password change

---

## Out of Scope (v1)

- Native mobile app — the web app is built mobile-responsive (Tailwind responsive classes) so members can use it on their phones, but there are no native iOS/Android apps and no dedicated mobile design phase
- In-app push notifications
- Payment / membership billing
- Athlete performance tracking / PR logging
- Multiple owner accounts per gym
- Inline workout editing after generation (owner can regenerate the full week or a single day via regenerate, but cannot edit text directly)
- Dark/light mode toggle (dark mode only)
- CSV member import
