# Drag-to-Fill Schedule Grid — Design Spec

## Goal

Add paint-mode drag interaction to the schedule grid so gym owners can enable or erase multiple time slots in a single drag gesture, instead of clicking each cell individually.

## Context

The existing grid (`components/schedule/schedule-grid.tsx`) uses `onClick` on each cell to toggle templates on/off or open a capacity popover. This is fine for sparse schedules but slow when setting up a full week. No API or data model changes are needed — only the interaction layer changes.

## Design

### Behavior

**Mousedown on an empty cell** → enters fill mode. That cell is created immediately via `POST /api/schedule/templates`.

**Mousedown on an active cell** → enters erase mode. That cell is deleted immediately via `DELETE /api/schedule/templates`.

**Drag (mousemove while button held)** → applies the same mode (fill or erase) to each new cell the pointer enters. Cells already processed during this drag are tracked in a set and skipped on re-entry.

**Mouseup anywhere** → ends the drag. State resets.

### Click vs Drag Distinction

A short press-and-release on the same active cell without leaving it is treated as a click, not a drag, and opens the capacity popover (existing behavior). Detection: if `mouseup` fires on the same cell that `mousedown` started on, and no other cells were entered during the gesture, it is a click.

### API Calls

- Each cell fires its API call immediately as the pointer enters it during a drag.
- Fill: `POST /api/schedule/templates` with `{ dayOfWeek, localTime, capacity: null }`
- Erase: `DELETE /api/schedule/templates` with `{ id }`
- Optimistic UI: cell state flips immediately; reverts on API failure.
- No batching needed — the existing endpoints handle individual cells.

### Direction

Drag works in any direction (down a column, across a row, diagonally). No axis locking.

### Drag end outside grid

`mouseup` is listened to on `window` (not just the grid) so releasing the mouse outside the grid boundary always ends the drag cleanly.

## Implementation

### Only file changed: `components/schedule/schedule-grid.tsx`

Three pieces of state added:

```ts
const [isDragging, setIsDragging] = useState(false)
const [dragMode, setDragMode] = useState<'fill' | 'erase' | null>(null)
const dragProcessed = useRef<Set<string>>(new Set())
const dragStartCell = useRef<string | null>(null)
```

Each cell gets `onMouseDown` and `onMouseEnter` handlers in addition to `onClick`.

**`onMouseDown(day, time)`:**
1. Record `dragStartCell` as `"${day}:${time}"`
2. Clear `dragProcessed`
3. Check if cell is active:
   - Active → set `dragMode = 'erase'`, call DELETE
   - Empty → set `dragMode = 'fill'`, call POST
4. Add cell key to `dragProcessed`
5. Set `isDragging = true`

**`onMouseEnter(day, time)`:**
- If not dragging, do nothing
- If cell key already in `dragProcessed`, skip
- Add to `dragProcessed`
- Apply `dragMode` (POST or DELETE)

**`onClick(day, time)`:**
- If the drag moved beyond the start cell (`dragProcessed.size > 1`), skip (already handled by drag)
- Otherwise, existing click logic (open popover for active cells)

**`useEffect` for mouseup:**
```ts
useEffect(() => {
  function handleMouseUp() {
    setIsDragging(false)
    setDragMode(null)
    dragProcessed.current.clear()
    dragStartCell.current = null
  }
  window.addEventListener('mouseup', handleMouseUp)
  return () => window.removeEventListener('mouseup', handleMouseUp)
}, [])
```

### CSS

Add `select-none` (or `user-select: none`) to the grid container while dragging to prevent text selection artifacts during the gesture.

## Error Handling

If a POST or DELETE fails during a drag, the optimistic state for that cell reverts (remove from `templates` if fill failed; re-add if erase failed). The drag continues — one failed cell doesn't abort the gesture.

## Out of Scope

- Touch/mobile drag (touch events have different semantics; can be added later)
- Undo/redo
- Visual drag trail or selection highlight beyond the existing active cell styling
