# Workout Editor — Design Spec
**Date:** 2026-03-24

## Overview
Allow gym owners to edit individual day workouts after AI generation, before publishing. Supports structured field editing and a free-text override mode.

## Scope
- Only applies to `draft` workout weeks — published weeks are read-only
- Edits update the `workouts` JSONB column on the `workout_weeks` table (no schema changes needed)
- No changes to member-facing views

## Data Types (existing, no changes)
```ts
interface WorkoutPart {
  label: string | null
  type: 'strength' | 'interval' | 'amrap' | 'fortime' | 'partner' | 'emom' | 'rest'
  content: string
}
interface WorkoutDay {
  day: string
  descriptor?: string
  parts: WorkoutPart[]
}
```

## Dashboard Changes (`app/(owner)/dashboard/page.tsx`)

### Edit Button
- Add an "Edit" button to each day column in `WorkoutWeekGrid` when `week.status === 'draft'`
- Clicking sets `editingDay: WorkoutDay | null` state and opens the `WorkoutEditModal`

### WorkoutWeekGrid (`components/workout/workout-week-grid.tsx`)
- Accept optional `onEdit?: (day: WorkoutDay) => void` prop
- When provided and week is draft, render a small "Edit" button below each day's `WorkoutCard`

## New Component: `WorkoutEditModal` (`components/workout/workout-edit-modal.tsx`)
Client component. Props:
```ts
{
  day: WorkoutDay
  weekId: string
  onSave: (updated: WorkoutDay) => void
  onClose: () => void
}
```

### Structured Mode (default)
- Editable `descriptor` text input at top
- For each `WorkoutPart`, show:
  - `label` text input (nullable — show placeholder "No label")
  - `type` select dropdown (strength | interval | amrap | fortime | partner | emom | rest)
  - `content` textarea (pre-wrap, monospace font to match display)
- "Add Part" button appends a blank part
- "Remove" button on each part (disabled if only 1 part remains)
- Parts are reorderable via Up/Down arrow buttons

### Free Text Mode
- Toggle button "Switch to free text" at top right of modal
- Converts current structured data to a plain textarea pre-filled with:
  ```
  [descriptor]

  [label]: [content]
  [label]: [content]
  ```
- "Switch to structured" toggle converts back by parsing the text into parts (best-effort — each double-newline-separated block becomes a part)
- Warn user: "Switching back to structured may lose formatting"

### Save
- "Save Changes" button calls `PATCH /api/workouts/[weekId]/day`
- On success: calls `onSave(updated)` to update local state, closes modal
- On error: shows inline error message

## New API Route: `PATCH /api/workouts/[weekId]/day` (`app/api/workouts/[weekId]/day/route.ts`)
- Auth: user must be owner of the gym that owns this week
- Body: `{ dayName: string, updatedDay: WorkoutDay }`
- Fetches the `workout_weeks` row, validates `status === 'draft'`
- Replaces the matching day in the `workouts` JSONB array (match by `day` string)
- Returns updated `workouts` array

## Constraints
- Do not change published week display
- Do not change member-facing `this-week` page
- Modal must use existing `Modal` component from `components/ui/modal.tsx` as base or match its styling
- Use existing Tailwind tokens only
