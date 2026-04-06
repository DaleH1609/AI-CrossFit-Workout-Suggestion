# Clear All and Capacity Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Clear all slots" button to the schedule grid header and redesign the slot capacity popover to show an explicit two-state override UX.

**Architecture:** Two components are modified. `capacity-popover.tsx` gains two new props (`dayOfWeek`, `defaults`), a new local state (`overriding`), and a new `handleClearOverride` handler; its JSX becomes a two-state layout. `schedule-grid.tsx` gains `confirmingClear` state, a `handleClearAll` handler, a flex wrapper around the grid header, and passes the two new props to `CapacityPopover`. No new files, no new API endpoints — all operations use existing `PATCH` and `DELETE` endpoints.

**Tech Stack:** React 18, Next.js 14 App Router, TypeScript, Tailwind CSS.

**Task dependencies:** Task 1 (`capacity-popover.tsx`) can be done independently. Task 2 depends on Task 1 being complete (it passes the new props). Task 3 (Clear All) is independent of both and can be done before or after Task 2. Tasks 1–3 must be complete before Task 4 (deploy).

---

## File Structure

| File | Change |
|------|--------|
| `components/schedule/capacity-popover.tsx` | Modify — new props, `overriding` state, two-state JSX, `handleClearOverride` |
| `components/schedule/schedule-grid.tsx` | Modify — pass new props to `CapacityPopover`; add `confirmingClear`, `handleClearAll`, header wrapper, cell-dim |

All paths below are relative to the repo root: `/Users/dalehealyegan/Desktop/CrossFit/crossfit-app`.

---

### Task 1: Upgrade `capacity-popover.tsx` — two-state override UI

**Files:**
- Modify: `components/schedule/capacity-popover.tsx`

**Background:** The current popover always shows an editable number input. After this task it will show two states: State A (using default — display label + Override button) and State B (custom value — input + Save + Clear override). Read the spec at `docs/superpowers/specs/2026-03-28-clear-all-and-override-design.md` and the current component before starting.

- [ ] **Step 1: Add `ScheduleDefaults` to the import**

Line 3 currently reads:
```ts
import { useEffect, useRef, useState } from 'react'
```
Change to:
```ts
import { useEffect, useRef, useState } from 'react'
import { ScheduleDefaults } from '@/lib/types'
```

- [ ] **Step 2: Replace the Props interface**

Find:
```ts
interface Props {
  templateId: string
  currentCapacity: number | null
  effectiveCapacity: number
  onSave: (capacity: number | null) => void
  onRemove: () => void
  onClose: () => void
}
```

Replace with:
```ts
interface Props {
  templateId: string
  currentCapacity: number | null
  effectiveCapacity: number
  dayOfWeek: number
  defaults: ScheduleDefaults
  onSave: (capacity: number | null) => void
  onRemove: () => void
  onClose: () => void
}
```

- [ ] **Step 3: Add the new props to the destructured parameter list**

Find:
```ts
export function CapacityPopover({
  templateId,
  currentCapacity,
  effectiveCapacity,
  onSave,
  onRemove,
  onClose,
}: Props) {
```

Replace with:
```ts
export function CapacityPopover({
  templateId,
  currentCapacity,
  effectiveCapacity,
  dayOfWeek,
  defaults,
  onSave,
  onRemove,
  onClose,
}: Props) {
```

- [ ] **Step 4: Add `overriding` state and helper values, after the existing `useState` declarations**

The current component has these state declarations:
```ts
  const [val, setVal] = useState(
    currentCapacity !== null ? String(currentCapacity) : String(effectiveCapacity)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)
```

After `const ref = useRef<HTMLDivElement>(null)`, insert:
```ts
  const [overriding, setOverriding] = useState(currentCapacity !== null)
  const hasDayDefault = defaults.dayDefaults[String(dayOfWeek)] !== undefined
  const defaultLabel = hasDayDefault ? 'day default' : 'global'
```

- [ ] **Step 5: Add `handleClearOverride`, immediately after the existing `handleRemove` function**

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

- [ ] **Step 6: Replace the entire JSX return block**

Find the return statement (everything from `return (` through the final `</div>` before the closing `}`). Replace it with:

```tsx
  return (
    <div
      ref={ref}
      className="absolute z-50 bg-zinc-900 border border-zinc-600 rounded-lg shadow-xl p-3 w-48"
      style={{ top: '100%', left: '50%', transform: 'translateX(-50%)' }}
    >
      {!overriding ? (
        <>
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
            <button
              onClick={handleRemove}
              disabled={saving}
              className="w-full text-red-400 hover:text-red-300 text-xs py-1 disabled:opacity-50"
            >
              Remove class
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-1">Capacity</p>
          <input
            type="number"
            min={1}
            max={200}
            value={val}
            onChange={e => { setVal(e.target.value); setError('') }}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-yellow-500 mb-1"
            autoFocus
          />
          {error && <p className="text-xs text-red-400 mb-1">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold rounded py-1 mb-2 disabled:opacity-50"
          >
            Save
          </button>
          <div className="flex justify-between border-t border-zinc-700 pt-2">
            <button
              onClick={handleClearOverride}
              disabled={saving}
              className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
            >
              Clear override
            </button>
            <button
              onClick={handleRemove}
              disabled={saving}
              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              Remove class
            </button>
          </div>
        </>
      )}
    </div>
  )
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/schedule/capacity-popover.tsx
git commit -m "feat: two-state capacity override popover"
```

---

### Task 2: Pass new props to `CapacityPopover` in `schedule-grid.tsx`

**Files:**
- Modify: `components/schedule/schedule-grid.tsx`

**Background:** `CapacityPopover` now requires `dayOfWeek` and `defaults`. The `ScheduleGrid` component already receives `defaults` as a prop and already has `day` in scope at the call site (from the `[1,2,3,4,5,6,7].map(day =>` loop). This task is a small two-prop addition to the existing `<CapacityPopover ... />` call site around line 297.

- [ ] **Step 1: Add `dayOfWeek` and `defaults` to the `CapacityPopover` call site**

Find (around line 297):
```tsx
                    <CapacityPopover
                      templateId={template.id}
                      currentCapacity={template.capacity}
                      effectiveCapacity={effectiveCapacity}
                      onSave={cap => handlePopoverSave(template.id, cap)}
                      onRemove={() => handlePopoverRemove(template.id)}
                      onClose={() => setPopover(null)}
                    />
```

Replace with:
```tsx
                    <CapacityPopover
                      templateId={template.id}
                      currentCapacity={template.capacity}
                      effectiveCapacity={effectiveCapacity}
                      dayOfWeek={day}
                      defaults={defaults}
                      onSave={cap => handlePopoverSave(template.id, cap)}
                      onRemove={() => handlePopoverRemove(template.id)}
                      onClose={() => setPopover(null)}
                    />
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/schedule/schedule-grid.tsx
git commit -m "feat: pass dayOfWeek and defaults to CapacityPopover"
```

---

### Task 3: Add Clear All to `schedule-grid.tsx`

**Files:**
- Modify: `components/schedule/schedule-grid.tsx`

**Background:** Three changes to `schedule-grid.tsx`: (1) add `confirmingClear` state and `handleClearAll` function, (2) wrap the grid header in a flex container and add the Clear All / confirm UI, (3) add `opacity-40 pointer-events-none` to the grid body wrapper while confirming. Read the spec before starting.

- [ ] **Step 1: Add `confirmingClear` state, after the existing `useState` declarations**

After the line `const [addError, setAddError] = useState('')`, insert:
```ts
  const [confirmingClear, setConfirmingClear] = useState(false)
```

- [ ] **Step 2: Add `handleClearAll`, after the `handleAddCustomTime` function**

```ts
  async function handleClearAll() {
    const snapshot = templates
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
    const anyFailed = results.some(
      r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)
    )
    if (anyFailed) setTemplates(snapshot)
  }
```

- [ ] **Step 3: Wrap the grid header in a flex container and add the Clear All button**

Find (around line 251):
```tsx
    <div className="overflow-x-auto select-none">
      {/* Grid header */}
      <div className="grid min-w-[640px]" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
        <div /> {/* time label column */}
        {DAY_NAMES.map(name => (
          <div key={name} className="text-center text-xs font-semibold text-yellow-400 py-2 border-b border-zinc-700">
            {name}
          </div>
        ))}
      </div>
```

Replace with:
```tsx
    <div className="overflow-x-auto select-none">
      {/* Grid header */}
      <div className="flex items-center justify-between mb-1 min-w-[640px]">
        <div className="grid flex-1" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
          <div /> {/* time label column */}
          {DAY_NAMES.map(name => (
            <div key={name} className="text-center text-xs font-semibold text-yellow-400 py-2 border-b border-zinc-700">
              {name}
            </div>
          ))}
        </div>
        {confirmingClear ? (
          <div className="flex items-center gap-2 text-xs shrink-0 ml-2">
            <span className="text-zinc-400">Remove all slots?</span>
            <button type="button" onClick={handleClearAll} className="text-red-400 hover:text-red-300 font-semibold">Yes</button>
            <button type="button" onClick={() => setConfirmingClear(false)} className="text-zinc-500 hover:text-zinc-300">Cancel</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setPopover(null); setConfirmingClear(true) }}
            className="text-xs text-red-400 hover:text-red-300 border border-zinc-700 hover:border-red-800 rounded px-2 py-0.5 shrink-0 ml-2"
          >
            Clear all
          </button>
        )}
      </div>
```

- [ ] **Step 4: Add cell dimming to the grid body wrapper during confirm**

Find (around line 263):
```tsx
      {/* Grid body */}
      <div className="min-w-[640px]">
```

Replace with:
```tsx
      {/* Grid body */}
      <div className={`min-w-[640px]${confirmingClear ? ' opacity-40 pointer-events-none' : ''}`}>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual smoke test**

Start the dev server (`npm run dev` in `/Users/dalehealyegan/Desktop/CrossFit/crossfit-app`) and open `/schedule`.

Test checklist:
- [ ] "Clear all" button appears top-right of the grid header
- [ ] Clicking "Clear all" shows "Remove all slots? Yes Cancel" inline; cells dim to ~40% opacity
- [ ] Clicking "Cancel" restores the button and removes the dim
- [ ] Clicking "Yes" removes all gold cells, dim disappears
- [ ] If grid is already empty, "Clear all" still shows (it's a no-op — `handleClearAll` fires with empty snapshot)
- [ ] Click a gold cell → popover shows "X (global)" or "X (day default)" + Override button (not the old input)
- [ ] Click "Override" → input appears, auto-focused, pre-filled with effective capacity
- [ ] Enter a value and Save → popover closes, cell still shows new value
- [ ] Reopen same cell → input pre-filled with the custom value (not global default)
- [ ] Click "Clear override" → slot reverts to global/day default label
- [ ] Click "Remove class" (either state) → slot disappears

- [ ] **Step 7: Commit**

```bash
git add components/schedule/schedule-grid.tsx
git commit -m "feat: add Clear All button with inline confirm"
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

Visit `/schedule` on the production URL. Run the click and drag test cases from Task 3 Step 6.
