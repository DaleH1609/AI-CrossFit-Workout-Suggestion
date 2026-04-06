# Clear All and Capacity Override — Design Spec

## Goal

Add two enhancements to the schedule grid page:
1. **Clear All** — a single button that removes every active time slot from the grid at once, with inline confirmation to prevent accidents.
2. **Capacity Override** — redesign the slot popover so it explicitly distinguishes between "using global default" and "custom override set", making the override intent clear.

## Context

The schedule grid (`components/schedule/schedule-grid.tsx`) uses optimistic updates and refs-based drag-to-fill interaction. The capacity popover (`components/schedule/capacity-popover.tsx`) currently shows a number input pre-filled with the effective capacity regardless of whether a custom value is set. No new API endpoints are needed — existing endpoints cover all required operations.

---

## Feature 1: Clear All

### Placement

The schedule grid header is currently a CSS grid row. Wrap it in a `<div className="flex items-center justify-between mb-1 min-w-[640px]">` with the existing grid header as a flex-grow child and the "Clear all" button at the far right of that wrapper.

### Button

```tsx
<button
  type="button"
  onClick={() => { setPopover(null); setConfirmingClear(true) }}
  className="text-xs text-red-400 hover:text-red-300 border border-zinc-700 hover:border-red-800 rounded px-2 py-0.5 shrink-0"
>
  Clear all
</button>
```

### Confirm state

When `confirmingClear` is `true`, the button is replaced inline by:

```tsx
<div className="flex items-center gap-2 text-xs shrink-0">
  <span className="text-zinc-400">Remove all slots?</span>
  <button type="button" onClick={handleClearAll} className="text-red-400 hover:text-red-300 font-semibold">Yes</button>
  <button type="button" onClick={() => setConfirmingClear(false)} className="text-zinc-500 hover:text-zinc-300">Cancel</button>
</div>
```

Opening the confirm state also calls `setPopover(null)` to close any open slot popover.

### Cell dimming during confirm

While `confirmingClear` is `true`, the grid body wrapper `<div className="min-w-[640px]">` gains `opacity-40 pointer-events-none` so all cells dim and cannot be interacted with.

### `handleClearAll` function

```ts
async function handleClearAll() {
  const snapshot = templates  // save for rollback
  setTemplates([])
  setConfirmingClear(false)
  const results = await Promise.allSettled(
    snapshot.map(t =>
      fetch('/api/schedule/templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id }),
      })
    )
  )
  const anyFailed = results.some(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok))
  if (anyFailed) setTemplates(snapshot)  // silent rollback; server-side partial state is acceptable
}
```

### State

One new `useState`:
```ts
const [confirmingClear, setConfirmingClear] = useState(false)
```

---

## Feature 2: Capacity Override Popover

### Props changes

Add `dayOfWeek: number` and `defaults: ScheduleDefaults` to the `CapacityPopover` Props interface:

```ts
interface Props {
  templateId: string
  currentCapacity: number | null
  effectiveCapacity: number
  dayOfWeek: number         // new
  defaults: ScheduleDefaults  // new — used to resolve the label
  onSave: (capacity: number | null) => void
  onRemove: () => void
  onClose: () => void
}
```

`ScheduleGrid` already receives `defaults` as a prop and already passes `template.id`, `template.capacity`, and `effectiveCapacity` to `CapacityPopover`. Add `dayOfWeek={day}` and `defaults={defaults}` to the existing `<CapacityPopover ... />` call site.

### Internal state

One new `useState` to track the override sub-state:
```ts
const [overriding, setOverriding] = useState(currentCapacity !== null)
```

Initialise to `true` when `currentCapacity` is already set (slot already has a custom value), `false` otherwise. This ensures re-opening the popover on a slot with an existing override goes straight to the input.

### Capacity label

```ts
const hasDayDefault = defaults.dayDefaults[String(dayOfWeek)] !== undefined
const defaultLabel = hasDayDefault ? 'day default' : 'global'
```

### State A — using default (`!overriding`)

```tsx
<p className="text-xs text-gray-400 mb-2">Capacity</p>
<div className="flex items-center justify-between mb-3">
  <span className="text-sm text-zinc-300">
    {effectiveCapacity}{' '}
    <span className="text-xs text-zinc-500">({defaultLabel})</span>
  </span>
  <button
    type="button"
    onClick={() => setOverriding(true)}
    className="text-xs text-yellow-400 border border-yellow-900 rounded px-2 py-0.5 hover:border-yellow-700"
  >
    Override
  </button>
</div>
<div className="border-t border-zinc-700 pt-2">
  <button onClick={handleRemove} disabled={saving} className="w-full text-red-400 hover:text-red-300 text-xs py-1 disabled:opacity-50">
    Remove class
  </button>
</div>
```

### State B — custom value (`overriding`)

```tsx
<p className="text-xs text-gray-400 mb-1">Capacity</p>
<input
  type="number" min={1} max={200}
  value={val}
  onChange={e => { setVal(e.target.value); setError('') }}
  className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-yellow-500 mb-1"
  autoFocus
/>
{error && <p className="text-xs text-red-400 mb-1">{error}</p>}
<button onClick={handleSave} disabled={saving} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold rounded py-1 mb-2 disabled:opacity-50">
  Save
</button>
<div className="flex justify-between border-t border-zinc-700 pt-2">
  <button onClick={handleClearOverride} disabled={saving} className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50">
    Clear override
  </button>
  <button onClick={handleRemove} disabled={saving} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">
    Remove class
  </button>
</div>
```

The `val` state initial value preserves the existing behaviour:
```ts
const [val, setVal] = useState(
  currentCapacity !== null ? String(currentCapacity) : String(effectiveCapacity)
)
```
When reopening a slot that already has a custom override, the input pre-fills with the existing custom value. When clicking Override on a slot using the default, it pre-fills with `effectiveCapacity`.

### `handleClearOverride` function

A separate handler distinct from `handleSave` (which rejects non-numeric values and cannot accept `null`):

```ts
async function handleClearOverride() {
  setSaving(true)
  const res = await fetch('/api/schedule/templates', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: templateId, capacity: null }),
  })
  setSaving(false)
  if (!res.ok) { setError('Failed to clear'); return }
  onSave(null)
  onClose()
}
```

Shares the existing `saving` flag and `error` state. Error message: `'Failed to clear'`.

### Escape key behaviour

Pressing Escape closes the popover entirely (existing `onClose()` call), regardless of which state (A or B) is active. It does **not** return State B to State A.

---

## File Structure

| File | Change |
|------|--------|
| `components/schedule/capacity-popover.tsx` | Modify — add `dayOfWeek`, `defaults` props; two-state UI; `handleClearOverride`; `overriding` state |
| `components/schedule/schedule-grid.tsx` | Modify — add `confirmingClear` state; `handleClearAll`; Clear All button/confirm in header; cell-dim during confirm; pass `dayOfWeek` + `defaults` to `CapacityPopover` |

All paths relative to `/Users/dalehealyegan/Desktop/CrossFit/crossfit-app`.

---

## Out of Scope

- Bulk capacity-setting (setting all slots to a specific value)
- Undo/redo for Clear All
- Per-day clear (clearing only one column)
- Touch/mobile drag
