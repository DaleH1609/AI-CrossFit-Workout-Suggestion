# Schedule Grid Redesign — Design Spec

## Goal

Replace the current list-based class schedule UI with an interactive Time × Day grid that lets gym owners manage their weekly recurring schedule visually, with three levels of capacity control.

## Context

The existing schedule uses `class_slot_templates` (day_of_week, local_time, capacity, active) to define a repeating weekly schedule. Class instances are generated from these templates. The data model is sound — only the UI needs replacing.

## Design

### Layout

A full-width grid where:
- **Rows** = time slots (6:00 AM to 9:00 PM, 30-minute increments by default)
- **Columns** = days of the week (Mon–Sun)
- **Gold cell** = class active at that time/day
- **Dashed cell** = no class, click to enable

A banner at the top of the page reads: _"↻ This schedule repeats every week automatically"_

### Capacity — Three Levels

1. **Global default** — a single input at the top of the page. Applied to all active slots that have no more specific override. Default value: 20.
2. **Per-day default** — a small input under each day column header. When set, overrides the global default for all slots on that day. Shown in gold when set, greyed out placeholder `—` when not.
3. **Per-slot override** — clicking an active (gold) cell opens a small inline popover to set a custom capacity for just that slot. The cell displays the effective capacity as a number.

Effective capacity resolution: slot override → day default → global default. Changing a global or day default does **not** mutate existing slot overrides — it only affects slots with no explicit override. This is non-destructive.

### Interactions

- **Click empty cell** → toggles class on (creates template), uses effective capacity
- **Click active cell** → opens inline popover with capacity input + "Remove class" button
- **Add custom time** → a time input + "Add Row" button below the grid adds a new row for any time outside the default 6am–9pm range
- All changes save immediately (no save button)

### Time Range

- Default: 6:00 AM – 9:00 PM, 30-minute increments (30 rows)
- Custom times added via "Add Row" insert a new row in sorted time order
- A custom time row is shown if (a) at least one day has a template at that time, or (b) the user just added it via "Add Row". Empty custom rows are removed automatically when the last template at that time is deleted.

## Data Model Changes

### New: `gym_schedule_defaults` table

Stores global and per-day capacity defaults per gym.

```sql
-- supabase/migrations/004_gym_schedule_defaults.sql
CREATE TABLE gym_schedule_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  day_of_week int CHECK (day_of_week IS NULL OR (day_of_week >= 1 AND day_of_week <= 7)), -- NULL = global default, 1=Mon...7=Sun
  default_capacity int NOT NULL DEFAULT 20,
  UNIQUE (gym_id, day_of_week)
);

ALTER TABLE gym_schedule_defaults ENABLE ROW LEVEL SECURITY;

-- Owners can read/write their own gym's defaults
CREATE POLICY "owner_manage_defaults" ON gym_schedule_defaults
  FOR ALL USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );

-- Members can read (needed to resolve effective capacity for display)
CREATE POLICY "member_read_defaults" ON gym_schedule_defaults
  FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid())
  );
```

`NULL` is used for `day_of_week` to represent the global default — consistent with SQL idioms and avoids conflict with the 1–7 constraint on `class_slot_templates`.

### Existing: `class_slot_templates` — make capacity nullable

```sql
-- supabase/migrations/005_nullable_template_capacity.sql
ALTER TABLE class_slot_templates ALTER COLUMN capacity DROP NOT NULL;

-- Set all existing templates to null so they inherit from defaults.
-- (Existing explicit "20" values were the old hardcoded default, not intentional overrides.)
UPDATE class_slot_templates SET capacity = NULL WHERE capacity IS NOT NULL;
```

When `capacity` is `NULL` on a template, the UI resolves effective capacity from the defaults table. When it is an explicit integer, that value is used as the slot override.

## API Changes

### `GET /api/schedule/templates`

Response extended to include defaults alongside templates:

```json
{
  "templates": [{ "id": "...", "day_of_week": 1, "local_time": "06:00", "capacity": null, "active": true }],
  "globalDefault": 20,
  "dayDefaults": { "6": 25, "7": 25 }
}
```

`dayDefaults` keys are day_of_week as strings (1–7). This flat structure matches the app's existing response pattern.

### New: `POST /api/schedule/defaults` (`app/api/schedule/defaults/route.ts`)

Upserts a global or per-day default. Owner auth required.

```json
// Request — global default
{ "dayOfWeek": null, "capacity": 20 }

// Request — Saturday default
{ "dayOfWeek": 6, "capacity": 25 }
```

Returns `{ success: true }` on success, `{ error: "..." }` with status 400/500 on failure. Capacity must be between 1 and 200.

### `POST /api/schedule/templates` — capacity now optional

`capacity` field is optional in the request body. When omitted or null, the template is created with `capacity = NULL` (inherits from defaults).

### `PATCH /api/schedule/templates` — unchanged

Sets an explicit per-slot capacity override. Accepts `capacity: null` to clear the override and revert to defaults.

### `DELETE /api/schedule/templates` — unchanged

## UI Components

### `app/(owner)/schedule/page.tsx` (replaced)

Client component. Fetches `/api/schedule/templates` on mount, renders the three sub-components below.

### `components/schedule/capacity-defaults.tsx` (new)

Global default input + 7 per-day inputs. Calls `POST /api/schedule/defaults` on blur/change. Receives `globalDefault` and `dayDefaults` as props and calls an `onUpdate` callback on save.

### `components/schedule/schedule-grid.tsx` (new)

The main grid. Props: `templates`, `globalDefault`, `dayDefaults`. Renders rows (times) × columns (days). Handles cell clicks — toggles templates on/off via `POST`/`DELETE /api/schedule/templates`. Calls `CapacityPopover` when an active cell is clicked.

### `components/schedule/capacity-popover.tsx` (new)

Small inline popover anchored to a cell. Contains a number input (1–200) to set per-slot capacity override and a "Remove class" button. Calls `PATCH /api/schedule/templates` on save and `DELETE` on remove. Closes on outside click or Escape.

## TypeScript Types

Add to `lib/types.ts`. The existing local `Template` interface inside `app/(owner)/schedule/page.tsx` is replaced by `ScheduleTemplate` — the page imports it from `lib/types`.

```ts
// lib/types.ts additions
export interface ScheduleTemplate {
  id: string
  day_of_week: number
  local_time: string
  capacity: number | null  // null = inherit from defaults
  active: boolean
}

export interface ScheduleDefaults {
  globalDefault: number
  dayDefaults: Record<string, number>  // key = day_of_week as string (1–7)
}
```

## Error Handling

All API errors follow the existing pattern: `{ "error": "message" }` with appropriate HTTP status. Capacity inputs validated: must be integer 1–200. UI shows inline error on failed API calls, reverts optimistic update.
