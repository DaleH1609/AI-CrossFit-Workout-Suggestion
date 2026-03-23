# CrossFit Workout Generator — Design Spec
**Date:** 2026-03-23
**Stack:** Next.js + Supabase + Claude API
**Reference UI:** Wodify (high-end, premium aesthetic)

---

## Overview

A web application that allows CrossFit gym owners to generate AI-powered weekly workout programs in their own coaching style, and allows members to view those workouts and book into class slots with full waitlist support.

---

## User Roles

### Gym Owner (Admin)
- Single account per gym
- Onboarding: pastes 4–7 example workouts to establish the gym's style profile
- Generates, reviews, and approves weekly workout programs before they go live
- Manages class times, capacity, and member invitations
- Can start a new program at any time (resets history and style profile)

### Member (Athlete)
- Invited by gym owner via email
- Views the published weekly workout schedule
- Books into class slots, cancels bookings, joins waitlists
- Receives email notifications for booking confirmations and waitlist promotions
- Cannot edit any content

Row-level security in Supabase ensures members only see data belonging to their gym.

---

## AI Workout Generation

### Onboarding
Owner pastes example workouts that represent their coaching style (movement selection, time domains, interval structures, strength formats). These are saved as the gym's **style profile**.

Example style (input format):
```
Monday
Part A: Romanian Deadlift

Part B:
500m Row / 10 Clean and Jerk — 2 rounds
Rest at minute 7
At minute 9: 1000m Bike / 10 Clean and Jerks — 2 rounds
Finish at 16 mins

Wednesday (Strength)
Power Clean — 5 sets x 1.1 reps
Back Squat — 4 sets x 2 reps
Pull-ups — 5 sets x 3 reps
```

### Generation Flow
1. Owner clicks **"Generate"** on the dashboard
2. System sends a prompt to the Claude API containing:
   - The gym's style profile (example workouts)
   - The last 4 weeks of generated workouts (for progressive programming context)
3. Claude returns a structured Mon–Fri week matching the gym's style
4. Owner reviews the generated week
5. Owner clicks **"Approve & Publish"** — workouts go live for members

### Progressive Programming
Each subsequent generation includes previous weeks as context. Claude ensures:
- No back-to-back repetition of the same primary movements
- Appropriate progression in loading and volume week over week
- Style consistency (interval structures, time domains, workout formats)

### New Program
Owner can click **"Start New Program"** at any time. This:
- Clears programming history
- Prompts owner to paste new example workouts
- Next generation starts fresh from the new style profile

---

## Class Booking System

### Class Schedule Setup (Owner)
- Owner defines recurring weekly class times per day (e.g. 6am, 9am, 5pm, 6pm)
- Each class slot has a configurable **max capacity** (e.g. 20 athletes)
- Times apply to every week automatically

### Member Booking
- Members view the weekly schedule: workout card per day + available class times
- Each time slot shows spots remaining
- Members click **"Book"** to reserve a spot
- Booking appears in their personal "My Schedule" view
- Members can cancel a booking at any time

### Waitlist
- When a class is full, members see **"Join Waitlist"**
- Waitlist is first-come-first-served
- When a cancellation occurs:
  1. Next person on waitlist is automatically promoted
  2. They receive an email notification with a confirmation window
  3. If they don't confirm within the window, the spot passes to the next person

### Owner Class Roster View
- Owner can view each class slot: full roster of booked athletes + waitlist
- Read-only view per class

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS |
| Backend / API | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password + invite flow) |
| AI | Claude API (claude-sonnet-4-6) |
| Email | Supabase Edge Functions + Resend |
| Hosting | Vercel |

---

## Data Model (Core Tables)

- **gyms** — gym profile, style examples, program history
- **users** — linked to Supabase Auth, role (owner/member), gym_id
- **workouts** — generated weekly programs (day, content, published status)
- **class_slots** — recurring class times (gym_id, day_of_week, time, capacity)
- **bookings** — member bookings (user_id, class_slot_id, date, status: booked/waitlist)
- **style_examples** — raw pasted example workouts per gym

---

## UI & Design

### Aesthetic
Premium, high-end athletic. Inspired by Wodify but elevated — Equinox meets CrossFit.

- **Background:** Near-black (`#0A0A0A`)
- **Text:** Crisp white
- **Accents:** Gold / champagne for CTAs and highlights
- **Whitespace:** Generous — never crowded
- **Animations:** Subtle hover transitions, skeleton loaders, smooth page transitions

### Typography
- **Headlines:** Sharp elegant serif (Playfair Display or Freight Display)
- **Body / Workout Text:** Clean geometric sans-serif (Inter or DM Sans)

### Components
- Glassmorphism workout cards — dark frosted glass, subtle gold border
- Premium buttons — outlined with gold fill on hover, subtle shadow
- No cheap gradients — restraint over decoration

### Gym Owner Dashboard
- Left sidebar: Weekly Program | Class Schedule | Members | Settings
- **Weekly Program page:** 5-column Mon–Fri grid of workout cards, "Generate" button top-right, "Approve & Publish" once reviewed
- **Style Profile page:** Manage example workouts, "Start New Program" button

### Member View
- Editorial-style weekly layout — one card per day
- Each card: workout content + class time slots with spots remaining
- Inline Book / Join Waitlist buttons
- "My Schedule" section: upcoming bookings with cancel option

---

## Notifications (Email Only)

| Trigger | Recipient |
|---|---|
| Booking confirmed | Member |
| Booking cancelled | Member |
| Waitlist spot available | Waitlisted member |
| Workouts published for the week | All gym members |

---

## Out of Scope (v1)

- Mobile app (web-responsive only)
- In-app notifications
- Payment / membership billing
- Performance tracking / athlete PRs
- Multi-gym owner accounts
- Workout editing after generation (approve or regenerate only)
