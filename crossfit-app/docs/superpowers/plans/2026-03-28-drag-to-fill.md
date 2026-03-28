# Drag-to-Fill Schedule Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add paint-mode drag interaction to the schedule grid so gym owners can drag across cells to enable or erase multiple time slots in one gesture.

**Architecture:** All changes are confined to `components/schedule/schedule-grid.tsx`. Drag tracking uses React refs (not state) to avoid stale closures in async handlers and the global mouseup listener. A `templatesRef` mirrors the `templates` state for use inside the zero-dependency mouseup effect. Existing API endpoints are reused unchanged.

**Tech Stack:** React 18, Next.js 14 App Router, TypeScript, Tailwind CSS. No new dependencies.

**Task dependencies:** Task 3 requires Task 1 and Task 2 to be completed first (imports and handlers must exist before JSX wiring). Tasks 1 and 2 can be done in sequence in any order relative to each other.

---

## File Structure

| File | Change |
|------|--------|
| `components/schedule/schedule-grid.tsx` | Modify only — add refs, two async helpers, two event handlers, global mouseup effect, update JSX |

All paths below are relative to the repo root: `/Users/dalehealyegan/Desktop/CrossFit/crossfit-app`.

---

### Task 1: Add refs and helpers (`callPost`, `callDelete`)

**Files:**
- Modify: `components/schedule/schedule-grid.tsx`

**Background:** The spec requires six drag-tracking refs plus a `templatesRef` mirror (seven total). Two async helper functions handle optimistic API calls. Read the spec at `docs/superpowers/specs/2026-03-28-drag-to-fill-design.md` and the current component before starting.

- [ ] **Step 1: Add `useRef` and `useEffect` to the React import**

Open `components/schedule/schedule-grid.tsx`. Line 2 currently reads:
```ts
import { useState, useCallback } from 'react'
```
Change it to:
```ts
import { useState, useCallback, useRef, useEffect } from 'react'
```
(`useEffect` is needed for the `templatesRef` sync in Step 3 and the mouseup handler in Task 2.)

- [ ] **Step 2: Add seven refs inside `ScheduleGrid`, after the existing `useState` declarations**

After the block ending with `const [addError, setAddError] = useState('')`, insert:

```ts
// Drag-to-fill refs — all refs so values are current in async handlers
const isDragging = useRef(false)
const dragMode = useRef<'fill' | 'erase' | null>(null)
const dragProcessed = useRef<Set<string>>(new Set())
const dragCellCount = useRef(0)
const eraseStartCell = useRef<{ day: number; time: string; templateId: string } | null>(null)
const eraseStartFired = useRef(false)
const templatesRef = useRef<ScheduleTemplate[]>([])
```

- [ ] **Step 3: Add the `templatesRef` sync effect, immediately after the refs block**

```ts
useEffect(() => { templatesRef.current = templates }, [templates])
```

- [ ] **Step 4: Add `callPost` helper, after the `getTemplate` useCallback**

```ts
async function callPost(day: number, time: string) {
  const tempId = crypto.randomUUID()
  const optimistic: ScheduleTemplate = {
    id: tempId, day_of_week: day, local_time: time, capacity: null, active: true,
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

- [ ] **Step 5: Add `callDelete` helper, immediately after `callPost`**

```ts
async function callDelete(templateId: string, day: number, time: string) {
  setTemplates(prev => prev.filter(t => t.id !== templateId))
  const res = await fetch('/api/schedule/templates', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: templateId }),
  })
  if (!res.ok) {
    setTemplates(prev => [...prev, {
      id: templateId, day_of_week: day, local_time: time, capacity: null, active: true,
    }])
  }
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/schedule/schedule-grid.tsx
git commit -m "feat: add drag refs and callPost/callDelete helpers"
```

---

### Task 2: Add `handleDragMouseDown`, `handleDragMouseEnter`, and global `mouseup` effect

**Files:**
- Modify: `components/schedule/schedule-grid.tsx`

**Background:** Three pieces of logic implement the drag. `handleDragMouseDown` starts each gesture. `handleDragMouseEnter` applies fill/erase as the pointer moves. The global `mouseup` useEffect ends the gesture and decides whether to open the popover (only for single click on an active cell). Read the spec before starting.

- [ ] **Step 1: Add `handleDragMouseDown`, after `handleAddCustomTime`**

```ts
function handleDragMouseDown(e: React.MouseEvent, day: number, time: string) {
  e.preventDefault() // prevent native drag-and-drop which suppresses mouseenter events

  // Close any open popover
  setPopover(null)

  // Reset all drag state
  isDragging.current = true
  dragMode.current = null
  dragProcessed.current.clear()
  dragCellCount.current = 0
  eraseStartCell.current = null
  eraseStartFired.current = false

  const template = getTemplate(day, time)

  if (template) {
    // Erase mode — deferred: don't delete yet, wait to confirm drag
    dragMode.current = 'erase'
    eraseStartCell.current = { day, time, templateId: template.id }
  } else {
    // Fill mode — immediate
    dragMode.current = 'fill'
    callPost(day, time)
  }

  dragProcessed.current.add(`${day}:${time}`)
  dragCellCount.current = 1
}
```

- [ ] **Step 2: Add `handleDragMouseEnter`, immediately after `handleDragMouseDown`**

```ts
function handleDragMouseEnter(day: number, time: string) {
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
    // Delete this cell only if active; skip empty cells silently.
    // dragProcessed blocks re-entry so no double-deletion risk.
    const template = getTemplate(day, time)
    if (template) callDelete(template.id, day, time)
  }
}
```

- [ ] **Step 3: Add the global `mouseup` useEffect, immediately after `handleDragMouseEnter`**

```ts
useEffect(() => {
  function handleMouseUp() {
    if (!isDragging.current) {
      return // No drag was active; nothing to clear or decide
    }

    const wasSingleCell = dragCellCount.current === 1
    const startedOnActive = dragMode.current === 'erase'
    const startCellNotDeleted = !eraseStartFired.current

    // Open popover only for single click on active cell (start cell never deleted).
    // Single click on empty cell: no popover (cell was just created).
    // Do NOT call getTemplate here — it closes over stale state. Use templatesRef.
    if (wasSingleCell && startedOnActive && startCellNotDeleted && eraseStartCell.current) {
      const { day, time } = eraseStartCell.current
      const template = templatesRef.current.find(
        t => t.day_of_week === day && t.local_time === time
      )
      if (template) setPopover({ templateId: template.id, dayOfWeek: day, localTime: time })
    }

    // Reset all refs after decision
    isDragging.current = false
    dragMode.current = null
    dragProcessed.current.clear()
    dragCellCount.current = 0
    eraseStartCell.current = null
    eraseStartFired.current = false
  }

  window.addEventListener('mouseup', handleMouseUp)
  return () => window.removeEventListener('mouseup', handleMouseUp)
}, []) // empty deps — reads state only via refs
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/schedule/schedule-grid.tsx
git commit -m "feat: add drag event handlers and mouseup effect"
```

---

### Task 3: Update JSX — wire drag events, remove `handleCellClick`

**Files:**
- Modify: `components/schedule/schedule-grid.tsx`

**Requires:** Tasks 1 and 2 must be complete.

**Background:** The existing `onClick` calls `handleCellClick`, which is fully replaced by `onMouseDown`/`onMouseEnter`. The drag events go on the wrapper `<div>` (not the `<button>`) because `mouseenter` does not bubble. The `<button>` remains for visual styling and accessibility — only its `onClick` is removed. `CapacityPopover` callbacks are untouched.

- [ ] **Step 1: Add `select-none` to the outermost container div**

Find and change:
```tsx
<div className="overflow-x-auto">
```
to:
```tsx
<div className="overflow-x-auto select-none">
```

- [ ] **Step 2: Replace the per-cell wrapper `<div>` and `<button>` with drag-enabled versions**

Find this exact block (around line 157 in the original file):
```tsx
<div key={day} className="relative p-0.5">
  <button
    onClick={() => handleCellClick(day, time)}
    className={`w-full h-10 rounded text-xs font-medium transition-colors ${
      isActive
        ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
        : 'border border-dashed border-zinc-700 hover:border-zinc-500 text-transparent hover:text-zinc-600'
    }`}
  >
    {isActive ? effectiveCapacity : '+'}
  </button>
```

Replace it with:
```tsx
<div
  key={day}
  className="relative p-0.5"
  onMouseDown={e => handleDragMouseDown(e, day, time)}
  onMouseEnter={() => handleDragMouseEnter(day, time)}
>
  <button
    className={`w-full h-10 rounded text-xs font-medium transition-colors ${
      isActive
        ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
        : 'border border-dashed border-zinc-700 hover:border-zinc-500 text-transparent hover:text-zinc-600'
    }`}
  >
    {isActive ? effectiveCapacity : '+'}
  </button>
```

The closing `</button>` is already in the file — do not duplicate it. Only replace the opening `<div>` and `<button>` tags as shown. The `{isPopoverOpen && template && <CapacityPopover .../>}` block and both closing `</div>` tags below remain unchanged.

- [ ] **Step 3: Delete `handleCellClick`**

Delete the entire `handleCellClick` function (the `async function handleCellClick(...)` block, currently around lines 70–84). Do not delete `handlePopoverSave` or `handlePopoverRemove` — those remain.

- [ ] **Step 4: Verify TypeScript compiles with no unused-variable warnings**

```bash
npx tsc --noEmit
```

Expected: no errors. Confirm `handleCellClick` is gone and not referenced anywhere.

- [ ] **Step 5: Start the dev server and manually test**

```bash
npm run dev
```

Open `http://localhost:3000/schedule` (log in as an owner).

**Test checklist:**
- [ ] Click an empty cell → class created (turns gold), no popover appears
- [ ] Click an active (gold) cell → popover opens, cell is NOT deleted
- [ ] Drag across multiple empty cells → all cells turn gold
- [ ] Drag from an active cell across other **active** cells → start cell + active cells in path are removed
- [ ] Drag from an active cell where the **first entered cell is empty** → start cell is NOT deleted (deferred delete never fires); subsequent active cells in path are deleted
- [ ] Drag from an active cell across a mix of active and empty cells → only active cells are removed, empty cells are silently skipped
- [ ] Release mouse outside the grid → drag ends cleanly, no stuck state on next interaction
- [ ] Open a popover, then mousedown elsewhere → popover closes immediately
- [ ] Existing API failures: disconnect network, try to create a cell → optimistic cell appears then disappears

- [ ] **Step 6: Commit**

```bash
git add components/schedule/schedule-grid.tsx
git commit -m "feat: wire drag events in JSX, remove handleCellClick"
```

---

### Task 4: Deploy to production

**Files:** None (deploy only)

- [ ] **Step 1: Deploy**

```bash
vercel --prod
```

Expected: build succeeds, deployment URL printed.

- [ ] **Step 2: Smoke test on production URL**

Visit `/schedule` on the production URL. Run the click and drag test cases from Task 3 Step 5.
