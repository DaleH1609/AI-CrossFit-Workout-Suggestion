# Clear All and Capacity Override — Design Spec

## Goal

Add two enhancements to the schedule grid page:
1. **Clear All** — a single button that removes every active time slot from the grid at once, with inline confirmation to prevent accidents.
2. **Capacity Override** — redesign the slot popover so it explicitly distinguishes between "using global default" and "custom override set", making the override intent clear.

## Context

The schedule grid (`components/schedule/schedule-grid.tsx`) uses optimistic updates and refs-based drag-to-fill interaction. The capacity popover (`components/schedule/capacity-popover.tsx`) currently shows a number input pre-filled with the effective capacity regardless of whether a custom value is set. No API changes are needed for either feature — existing endpoints cover all required operations.

## Feature 1: Clear All

### Placement

A "Clear all" button sits in the top-right corner of the schedule grid header row, level with the day-column headings.

### Interaction flow

1. **Idle** — small red-tinted button: `Clear all`
2. **Confirm** — clicking the button replaces it inline with: `Remove all slots? [Yes] [Cancel]`. Active (gold) cells dim to ~40% opacity as a visual hint that they are about to be removed.
3. **Yes** — optimistic removal: `setTemplates([])`, then fire `DELETE /api/schedule/templates` for every template in parallel. On any failure, restore the full list and show no error UI (silent rollback — user can retry).
4. **Cancel** — return to idle, opacity restored.

### Scope

Only removes active templates from state/API. Does not touch custom time rows (rows added via "Add Row"), capacity defaults, or day-override defaults.

### Component

All changes are inside `components/schedule/schedule-grid.tsx`. No new files.

### State

One new boolean `useState`: `confirmingClear`. `true` while the confirm prompt is shown.

---

## Feature 2: Capacity Override Popover

### Two states

**State A — using global (or day) default** (`currentCapacity === null`)

- Header: "Capacity"
- Body: displays effective capacity as `X (global)` or `X (day default)` in muted text
- Action: yellow "Override" button on the same row as the label
- Footer: "Remove class" in red

**State B — custom capacity set** (`currentCapacity !== null`, OR after clicking Override)

- Header: "Capacity"
- Body: number input pre-filled with the current custom value, auto-focused
- Actions: full-width yellow "Save" button
- Footer: "Clear override" (left, muted) | "Remove class" (right, red)

### Transitions

- Clicking **Override** in State A: transition to State B, input auto-focuses, pre-filled with effective capacity.
- Clicking **Save** in State B: PATCH with the entered value → calls `onSave(capacity)` → closes popover.
- Clicking **Clear override** in State B: PATCH with `capacity: null` → calls `onSave(null)` → closes popover (slot reverts to global/day default display).
- Clicking **Remove class** (either state): DELETE → calls `onRemove()` → closes popover (unchanged from current behaviour).

### "Day default" label

When the slot's day has an explicit default in `defaults.dayDefaults`, the label reads `X (day default)` instead of `X (global)`.

### Component

All changes are inside `components/schedule/capacity-popover.tsx`. The Props interface gains one field:
```ts
dayOfWeek: number   // passed from ScheduleGrid so the popover can resolve the label
```
`ScheduleGrid` must pass `dayOfWeek` to the `CapacityPopover` call site, and also pass `defaults` down (it already receives `defaults` as a prop).

---

## File Structure

| File | Change |
|------|--------|
| `components/schedule/capacity-popover.tsx` | Modify — add `dayOfWeek` prop, two-state UI, Clear override action |
| `components/schedule/schedule-grid.tsx` | Modify — add Clear All button/confirm, pass `dayOfWeek` + `defaults` to `CapacityPopover` |

All paths relative to `/Users/dalehealyegan/Desktop/CrossFit/crossfit-app`.

---

## Out of Scope

- Bulk capacity-setting (setting all slots to a specific value)
- Undo/redo for Clear All
- Per-day clear (clearing only one column)
- Touch/mobile drag
