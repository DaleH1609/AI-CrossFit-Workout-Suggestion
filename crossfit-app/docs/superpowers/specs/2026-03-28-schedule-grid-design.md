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

Effective capacity resolution: slot override → day default → global default.

### Interactions

- **Click empty cell** → toggles class on (creates template), uses effective capacity
- **Click active cell** → opens inline popover with capacity input + remove button
- **Add custom time** → a time input + "Add Row" button below the grid adds a new row for any time outside the default range
- All changes save immediately (no save button needed)

### Time Range

- Default: 6:00 AM – 9:00 PM, 30-minute increments (30 rows)
- Custom times added via "Add Row" insert a new row in sorted order
- Custom rows are persisted as part of the gym's template set

## Data Model Changes

### New: `gym_schedule_defaults` table
Stores global and per-day capacity defaults per gym.

```sql
CREATE TABLE gym_schedule_defaults (
  gym_id uuid REFERENCES gyms(id) ON DELETE CASCADE,
  day_of_week int, -- null = global default
  default_capacity int NOT NULL DEFAULT 20,
  PRIMARY KEY (gym_id, day_of_week)
);
-- Global default stored with day_of_week = 0 (sentinel value)
```

### Existing: `class_slot_templates`
No schema changes needed. The `capacity` column stores the per-slot override when set explicitly; otherwise the UI resolves from the defaults table.

A new nullable flag approach: when a template is created by clicking a cell, its `capacity` is set to `null` to mean "use defaults". When overridden via the popover, it is set to an explicit integer.

> Requires a migration: `ALTER TABLE class_slot_templates ALTER COLUMN capacity DROP NOT NULL;`

## API Changes

### `GET /api/schedule/templates`
Returns templates + gym schedule defaults in one response:
```json
{
  "templates": [...],
  "defaults": { "global": 20, "byDay": { "6": 25, "7": 25 } }
}
```

### `POST /api/schedule/defaults`
Upsert global or per-day default capacity.
```json
{ "dayOfWeek": 0, "capacity": 20 }  // 0 = global
{ "dayOfWeek": 6, "capacity": 25 }  // Saturday
```

### `POST /api/schedule/templates` (unchanged)
Creates a new template. `capacity` field is now optional (null = use defaults).

### `PATCH /api/schedule/templates` (unchanged)
Updates capacity on an existing template (per-slot override).

### `DELETE /api/schedule/templates` (unchanged)

## UI Components

### `ScheduleGrid` (new, `components/schedule/schedule-grid.tsx`)
The main grid component. Renders the time × day table, handles cell clicks, manages optimistic state updates.

### `CapacityPopover` (new, `components/schedule/capacity-popover.tsx`)
Small inline popover that appears when clicking an active cell. Contains a number input and a "Remove class" button.

### `CapacityDefaults` (new, `components/schedule/capacity-defaults.tsx`)
The global + per-day capacity controls rendered above the grid.

### `app/(owner)/schedule/page.tsx` (replaced)
Becomes a thin client wrapper that fetches data and renders the three new components.

## Behaviour Notes

- All mutations are optimistic — the UI updates immediately, API call happens in background, reverts on error
- The grid scrolls vertically on small screens; days are always visible (sticky left column for time labels)
- Empty rows with no active classes in the default range are still shown (the grid is always full 6am–9pm)
- Custom time rows only appear if at least one day has a class at that time, or after "Add Row" is used
