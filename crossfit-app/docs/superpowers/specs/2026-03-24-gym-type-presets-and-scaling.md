# Gym Type Presets & Auto-Scaling — Design Spec
**Date:** 2026-03-24

## Overview
Two related features:
1. **Gym type presets** — owners select CrossFit or Hyrox at signup. When fewer than 3 style examples exist, the AI uses a built-in prompt for that gym type instead of failing.
2. **Auto-scaling** — each generated WOD includes Rx, Scaled, and Beginner versions automatically.

---

## Part 1: Gym Type Presets

### Database Change
Add `gym_type` column to `gyms` table:
```sql
ALTER TABLE gyms ADD COLUMN gym_type text NOT NULL DEFAULT 'crossfit'
  CHECK (gym_type IN ('crossfit', 'hyrox'));
```
Run as a new migration: `supabase/migrations/003_gym_type.sql`

### Signup Flow (`app/(auth)/signup/page.tsx`)
- Add a `gymType` field to form state (default `'crossfit'`)
- Add radio button group below the gym name input:
  - **CrossFit** — "Classic WODs, strength work, and functional fitness"
  - **Hyrox** — "Race-format training with ski erg, sleds, and functional stations"
- Pass `gymType` in the POST body to `/api/auth/signup`

### Signup API (`app/api/auth/signup/route.ts`)
- Accept `gymType` from request body (default `'crossfit'` if absent)
- Pass `gym_type: gymType` when inserting into `gyms`

### Settings Page (`app/(owner)/settings/page.tsx`)
- Add a "Gym Type" section with the same CrossFit/Hyrox radio buttons
- On change, call `PATCH /api/settings/gym` with `{ gymType }`
- New API route: `app/api/settings/gym/route.ts` — updates `gym_type` on the gym row (owner only)

### Generation Logic (`app/api/workouts/generate/route.ts`)
- Fetch `gym_type` from the gym row alongside existing data
- Change the style examples check: if `examples.length < 3`, do NOT return a 400 error — instead pass `gymType` to `generateWorkouts` with empty `styleExamples`
- Update `generateWorkouts` signature: `generateWorkouts(styleExamples: string[], history: WorkoutWeek[], gymType: 'crossfit' | 'hyrox')`

### Prompts (`lib/claude/prompts.ts`)
Update `buildGenerationPrompt` to accept `gymType` and `styleExamples`:

**If styleExamples.length >= 3:** Existing behaviour — use examples.

**If styleExamples.length < 3 — CrossFit built-in prompt:**
```
You are an expert CrossFit programmer. Generate a Mon–Fri week with:
- Monday: Strength (squat/hinge) + interval conditioning
- Tuesday: For-time or AMRAP with gymnastics and cardio
- Wednesday: Pure strength (push/pull focus)
- Thursday: Partner or team workout
- Friday: Open-style benchmark or chipper
Use classic CrossFit movements: barbell cycling, gymnastics (pull-ups, HSPU, T2B),
monostructural cardio (row, bike, run), and kettlebell work.
Vary loading and time domains across the week.
```

**If styleExamples.length < 3 — Hyrox built-in prompt:**
```
You are an expert Hyrox programmer. Generate a Mon–Fri training week with:
- Monday: Ski erg intervals + strength (deadlift or squat)
- Tuesday: Sled push/pull work + accessory lifting
- Wednesday: Running + wall balls + sandbag lunges (race simulation)
- Thursday: Farmers carry + burpee broad jumps + rowing
- Friday: Full Hyrox race simulation (all 8 stations in sequence)
Hyrox stations: 1km run (between each), ski erg 1000m, sled push 50m,
sled pull 50m, burpee broad jumps 80m, rowing 1000m, farmers carry 200m,
sandbag lunges 100m, wall balls 100 reps.
Keep weights competition-standard (men/women Rx). Include scaling options.
```

---

## Part 2: Auto-Scaling

### Type Change (`lib/types.ts`)
Add optional `scaling` to `WorkoutDay`:
```ts
export interface WorkoutScaling {
  rx: string
  scaled: string
  beginner: string
}
export interface WorkoutDay {
  day: string
  descriptor?: string
  parts: WorkoutPart[]
  scaling?: WorkoutScaling  // NEW — optional, added by post-processing
}
```

### Generation (`lib/claude/generate-workouts.ts`)
After generating the week, make a second Claude call to generate scaling for each day:
- New function: `generateScaling(week: WorkoutWeek): Promise<WorkoutWeek>`
- Prompt: given the 5-day workout week JSON, return the same JSON with a `scaling` object added to each day containing `rx`, `scaled`, and `beginner` as plain text strings
- Attach result to each `WorkoutDay` before saving to Supabase
- If scaling generation fails, save without scaling (non-blocking — workouts still save)

### Display (`components/workout/workout-card.tsx`)
- If `day.scaling` exists, add a collapsible "Scaling" section at the bottom of the card
- Collapsed by default, toggle with a "Show scaling ▾" button
- Shows three rows: **Rx** / **Scaled** / **Beginner** with their text

### Validation (`lib/claude/generate-workouts.ts`)
- `validateWorkoutWeek` already ignores unknown fields — no change needed for the scaling field to pass through

## Constraints
- Gym type migration must be in a new file `003_gym_type.sql`, not modify existing migrations
- Auto-scaling must be non-blocking — a failure must not prevent workout week creation
- Do not change the `workout_weeks` table schema — `scaling` is stored inside the existing `workouts` JSONB
- Use existing Tailwind tokens only
