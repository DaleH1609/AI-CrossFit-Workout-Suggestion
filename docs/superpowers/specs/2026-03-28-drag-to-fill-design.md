# Drag-to-Fill Schedule Grid — Design Spec

## Goal

Add paint-mode drag interaction to the schedule grid so gym owners can enable or erase multiple time slots in a single drag gesture, instead of clicking each cell individually.

## Context

The existing grid (`components/schedule/schedule-grid.tsx`) uses `onClick` on each cell to toggle templates on/off or open a capacity popover. No API or data model changes are needed — only the interaction layer in this one file changes.

`ScheduleTemplate.id` is a `string` (UUID), so `crypto.randomUUID()` is a valid temporary id.

## Behavior

### Fill mode (drag from empty cell)

- `mousedown` on an empty cell → enter fill mode, create that cell immediately via POST (optimistic).
- Each new cell entered while dragging → create via POST (optimistic).
- Empty cells entered mid-erase drag are silently skipped (no POST, no effect).
- `mouseup` on the same cell (single click) → no popover; cell was just created.

### Erase mode (drag from active cell)

- `mousedown` on an active cell → enter erase mode, **do not delete yet**. Record the start cell.
- First new cell entered → delete **both** the start cell and the new cell via DELETE (optimistic). Skip new cell if it is empty (no template to delete).
- Each subsequent active cell entered → delete via DELETE (optimistic). Empty cells are silently skipped.
- `mouseup` on the same active cell (no drag, start cell never deleted) → **open the capacity popover** (existing behavior preserved).

This deferred-erase design means a plain click on an active cell always opens the popover, never accidentally deletes it.

### Drag end

`mouseup` is listened to on `window` so releasing the mouse outside the grid always ends the drag cleanly.

## Implementation

### Only file changed: `components/schedule/schedule-grid.tsx`

Add `useRef` to the React import (it is not currently imported).

### Event placement

All drag events (`onMouseDown`, `onMouseEnter`) go on the **wrapper `<div>`** (`<div className="relative p-0.5">`) surrounding each cell's `<button>`, not on the button.

The existing `handleCellClick` tied to `onClick` on the `<button>` is **removed**. The `CapacityPopover` callbacks (`handlePopoverSave`, `handlePopoverRemove`) are unchanged — only the cell toggle/open handler is removed.

### `e.preventDefault()` in `onMouseDown`

Call `e.preventDefault()` on the mousedown event on the wrapper div. This prevents the browser from starting a native HTML5 drag-and-drop gesture, which would suppress `mouseenter` events and silently break paint behavior after the first cell. Placing it on the wrapper div (not the button) avoids interfering with button focus.

### Refs

All drag tracking uses refs so values are always current in async callbacks and event listeners. React state updates are async; a `mouseup` listener registered with a `templates` state dependency would be torn down and re-registered on every optimistic update mid-drag, risking a missed mouseup. Using a `templatesRef` mirror avoids this.

```ts
const isDragging = useRef(false)
const dragMode = useRef<'fill' | 'erase' | null>(null)
const dragProcessed = useRef<Set<string>>(new Set())   // "day:time" keys processed this drag
const dragCellCount = useRef(0)                         // cells processed this drag (including start)
const eraseStartCell = useRef<{ day: number; time: string; templateId: string } | null>(null)
const eraseStartFired = useRef(false)   // true once start cell's DELETE has been issued
const templatesRef = useRef<ScheduleTemplate[]>([])     // mirror of templates state for mouseup
```

Keep `templatesRef` in sync:
```ts
// After the templates useState declaration:
useEffect(() => { templatesRef.current = templates }, [templates])
```

### Popover on mousedown

If a popover is already open when `mousedown` fires, close it immediately by calling `setPopover(null)` at the top of `onMouseDown` before any other logic. This ensures the previous popover never lingers during a new drag gesture.

### `onMouseDown(e, day, time)` on wrapper div

```
e.preventDefault()

isDragging.current = true
dragMode.current = null
dragProcessed.current.clear()
dragCellCount.current = 0
eraseStartCell.current = null
eraseStartFired.current = false

const template = getTemplate(day, time)

if (template) {
  dragMode.current = 'erase'
  eraseStartCell.current = { day, time, templateId: template.id }
} else {
  dragMode.current = 'fill'
  callPost(day, time)
}

dragProcessed.current.add(`${day}:${time}`)
dragCellCount.current = 1
```

### `onMouseEnter(day, time)` on wrapper div

```
if (!isDragging.current) return
const key = `${day}:${time}`
if (dragProcessed.current.has(key)) return

dragProcessed.current.add(key)
dragCellCount.current++

if (dragMode.current === 'fill') {
  callPost(day, time)
}

if (dragMode.current === 'erase') {
  // Fire deferred start cell deletion on first new cell entered
  if (!eraseStartFired.current && eraseStartCell.current) {
    eraseStartFired.current = true
    const s = eraseStartCell.current
    callDelete(s.templateId, s.day, s.time)
  }
  // Delete this cell if it is active (skip empty cells silently).
  // `getTemplate` may read a slightly stale `templates` snapshot (async state),
  // but re-entry of already-processed cells is blocked by `dragProcessed`,
  // so double-deletion of the same cell cannot occur.
  const template = getTemplate(day, time)
  if (template) callDelete(template.id, day, time)
}
```

### Global `mouseup` via `useEffect`

The effect has **no dependencies** (`[]`) to avoid re-registering mid-drag. It reads current values via refs, including `templatesRef.current` instead of the `templates` state variable.

```ts
useEffect(() => {
  function handleMouseUp() {
    if (!isDragging.current) {
      return  // No drag was active; nothing to clear or decide
    }

    const wasSingleCell = dragCellCount.current === 1
    const startedOnActive = dragMode.current === 'erase'
    const startCellNotDeleted = !eraseStartFired.current

    // Open popover: single click on active cell only (start cell never deleted)
    // Single click on empty cell: no popover (fill just created the cell)
    if (wasSingleCell && startedOnActive && startCellNotDeleted && eraseStartCell.current) {
      const { day, time } = eraseStartCell.current
      const template = templatesRef.current.find(
        t => t.day_of_week === day && t.local_time === time
      )
      if (template) setPopover({ templateId: template.id, dayOfWeek: day, localTime: time })
    }
    // No action needed for wasSingleCell && dragMode === 'fill' (cell already created)

    // Reset all refs — always, even on early-return cases
    isDragging.current = false
    dragMode.current = null
    dragProcessed.current.clear()
    dragCellCount.current = 0
    eraseStartCell.current = null
    eraseStartFired.current = false
  }

  window.addEventListener('mouseup', handleMouseUp)
  return () => window.removeEventListener('mouseup', handleMouseUp)
}, [])  // empty deps — reads state via refs only
```

Note: `dragCellCount === 1` means the start cell was the only cell processed. If the pointer trembles into an adjacent cell before mouseup, `dragCellCount` becomes 2 and the popover does not open. This is acceptable — the user did initiate a drag gesture.

Do **not** call `getTemplate` inside the mouseup handler. `getTemplate` closes over the `templates` state variable and will be stale. Use `templatesRef.current.find(...)` directly, as shown above.

### Optimistic fill (`callPost`)

```ts
async function callPost(day: number, time: string) {
  const tempId = crypto.randomUUID()
  const optimistic: ScheduleTemplate = {
    id: tempId, day_of_week: day, local_time: time, capacity: null, active: true
  }
  setTemplates(prev => [...prev, optimistic])
  const res = await fetch('/api/schedule/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dayOfWeek: day, localTime: time, capacity: null }),
  })
  if (!res.ok) {
    setTemplates(prev => prev.filter(t => t.id !== tempId))
    return
  }
  const { template } = await res.json()
  setTemplates(prev => prev.map(t => t.id === tempId ? template : t))
}
```

### Optimistic erase (`callDelete`)

```ts
async function callDelete(templateId: string, day: number, time: string) {
  setTemplates(prev => prev.filter(t => t.id !== templateId))
  const res = await fetch('/api/schedule/templates', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: templateId }),
  })
  if (!res.ok) {
    // Restore the deleted template; capacity reverts to null (inherits from defaults)
    setTemplates(prev => [...prev, {
      id: templateId, day_of_week: day, local_time: time, capacity: null, active: true
    }])
  }
}
```

### CSS

Add `select-none` permanently to the outermost grid container `<div>`. Prevents text selection during drag with no adverse effects otherwise.

## Behavior summary

| Gesture | Start cell | Result |
|---------|-----------|--------|
| Click on empty cell | Empty | Cell created, no popover |
| Click on active cell | Active | Popover opens, no deletion |
| Drag from empty → more cells | Empty | All entered active cells created; empty cells entered mid-drag skipped |
| Drag from active → more cells | Active | Start cell + entered active cells deleted; empty cells skipped |

## Out of Scope

- Touch/mobile drag (can be added later)
- Undo/redo
- Visual drag trail beyond existing cell styling
