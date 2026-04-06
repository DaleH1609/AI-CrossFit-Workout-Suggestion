# Schedule Grid Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the list-based class schedule UI with a Time×Day grid that lets gym owners manage their weekly recurring schedule visually, with three levels of capacity control.

**Architecture:** New `gym_schedule_defaults` table stores global + per-day capacity defaults. The `class_slot_templates.capacity` column becomes nullable (NULL = inherit). The GET templates endpoint returns defaults alongside templates. A new POST defaults endpoint upserts defaults. Three new React components handle the grid, popovers, and defaults inputs.

**Tech Stack:** Next.js 14 App Router, Supabase (SQL migrations + RLS), TypeScript, Tailwind CSS

---

## File Map

| File | Status | Role |
|------|--------|------|
| `supabase/migrations/004_gym_schedule_defaults.sql` | Create | New gym_schedule_defaults table + RLS |
| `supabase/migrations/005_nullable_template_capacity.sql` | Create | Make class_slot_templates.capacity nullable |
| `lib/types.ts` | Modify | Add ScheduleTemplate + ScheduleDefaults interfaces |
| `app/api/schedule/templates/route.ts` | Modify | GET returns defaults; POST accepts optional capacity; PATCH accepts null capacity |
| `app/api/schedule/defaults/route.ts` | Create | POST upserts global/per-day capacity defaults; DELETE removes a per-day default |
| `components/schedule/capacity-defaults.tsx` | Create | Global + per-day capacity inputs |
| `components/schedule/capacity-popover.tsx` | Create | Inline popover for per-slot capacity + remove |
| `components/schedule/schedule-grid.tsx` | Create | Main Time×Day grid |
| `app/(owner)/schedule/page.tsx` | Replace | Client page composing all three components |

---

## Task 1: Database Migration — gym_schedule_defaults table

**Files:**
- Create: `supabase/migrations/004_gym_schedule_defaults.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/004_gym_schedule_defaults.sql
CREATE TABLE gym_schedule_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  day_of_week int CHECK (day_of_week IS NULL OR (day_of_week >= 1 AND day_of_week <= 7)),
  default_capacity int NOT NULL DEFAULT 20,
  UNIQUE (gym_id, day_of_week)
);

ALTER TABLE gym_schedule_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_defaults" ON gym_schedule_defaults
  FOR ALL USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "member_read_defaults" ON gym_schedule_defaults
  FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid())
  );
```

- [ ] **Step 2: Run the migration in your Supabase dashboard**

Go to Supabase Dashboard → SQL Editor → paste and run the migration.

Expected: Table created with no errors.

- [ ] **Step 3: Verify the table exists**

In the Supabase Dashboard → Table Editor, confirm `gym_schedule_defaults` appears with columns: `id`, `gym_id`, `day_of_week`, `default_capacity`.

---

## Task 2: Database Migration — nullable capacity on class_slot_templates

**Files:**
- Create: `supabase/migrations/005_nullable_template_capacity.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/005_nullable_template_capacity.sql
ALTER TABLE class_slot_templates ALTER COLUMN capacity DROP NOT NULL;

-- Existing "20" values were the old hardcoded default, not intentional overrides.
-- Set them to null so they inherit from the new defaults system.
UPDATE class_slot_templates SET capacity = NULL WHERE capacity IS NOT NULL;
```

- [ ] **Step 2: Run the migration in your Supabase dashboard**

Paste and run in SQL Editor.

Expected: No errors, `capacity` column is now nullable, existing rows have `capacity = NULL`.

---

## Task 3: TypeScript Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the two new interfaces at the bottom of lib/types.ts**

```ts
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

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`

Expected: No errors related to lib/types.ts.

---

## Task 4: Extend GET /api/schedule/templates

**Files:**
- Modify: `app/api/schedule/templates/route.ts`

The GET handler must now also fetch `gym_schedule_defaults` and return `globalDefault` + `dayDefaults` alongside templates.

- [ ] **Step 1: Replace the GET handler**

Replace the existing `GET` function (lines 4–12) with:

```ts
export async function GET() {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth

  const [{ data: templates }, { data: defaults }] = await Promise.all([
    supabase.from('class_slot_templates').select('*')
      .eq('gym_id', userData.gym_id).eq('active', true)
      .order('day_of_week').order('local_time'),
    supabase.from('gym_schedule_defaults').select('*')
      .eq('gym_id', userData.gym_id),
  ])

  const globalRow = defaults?.find(d => d.day_of_week === null)
  const globalDefault = globalRow?.default_capacity ?? 20

  const dayDefaults: Record<string, number> = {}
  for (const d of defaults ?? []) {
    if (d.day_of_week !== null) {
      dayDefaults[String(d.day_of_week)] = d.default_capacity
    }
  }

  return NextResponse.json({ templates: templates ?? [], globalDefault, dayDefaults })
}
```

- [ ] **Step 2: Update POST to accept optional capacity**

Replace the existing `POST` function with:

```ts
export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { dayOfWeek, localTime, capacity } = await req.json()
  const { data } = await supabase.from('class_slot_templates')
    .insert({
      gym_id: userData.gym_id,
      day_of_week: dayOfWeek,
      local_time: localTime,
      capacity: capacity ?? null,
    })
    .select().single()
  return NextResponse.json({ template: data })
}
```

- [ ] **Step 3: Update PATCH to accept null capacity**

Replace the existing `PATCH` function with:

```ts
export async function PATCH(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { id, capacity } = await req.json()

  if (capacity !== null && (typeof capacity !== 'number' || capacity < 1 || capacity > 200)) {
    return NextResponse.json({ error: 'Capacity must be between 1 and 200' }, { status: 400 })
  }

  const { data, error } = await supabase.from('class_slot_templates')
    .update({ capacity: capacity ?? null })
    .eq('id', id)
    .eq('gym_id', userData.gym_id)
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No type errors.

---

## Task 5: New POST /api/schedule/defaults route

**Files:**
- Create: `app/api/schedule/defaults/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { dayOfWeek, capacity } = await req.json()

  if (typeof capacity !== 'number' || capacity < 1 || capacity > 200) {
    return NextResponse.json({ error: 'Capacity must be between 1 and 200' }, { status: 400 })
  }

  // dayOfWeek: null = global default, 1–7 = per-day default
  if (dayOfWeek !== null && (typeof dayOfWeek !== 'number' || dayOfWeek < 1 || dayOfWeek > 7)) {
    return NextResponse.json({ error: 'dayOfWeek must be null or 1–7' }, { status: 400 })
  }

  const { error } = await supabase.from('gym_schedule_defaults')
    .upsert(
      { gym_id: userData.gym_id, day_of_week: dayOfWeek ?? null, default_capacity: capacity },
      { onConflict: 'gym_id,day_of_week' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { dayOfWeek } = await req.json()

  // Only per-day defaults can be deleted (null = global; don't allow deleting global)
  if (typeof dayOfWeek !== 'number' || dayOfWeek < 1 || dayOfWeek > 7) {
    return NextResponse.json({ error: 'dayOfWeek must be 1–7' }, { status: 400 })
  }

  const { error } = await supabase.from('gym_schedule_defaults')
    .delete()
    .eq('gym_id', userData.gym_id)
    .eq('day_of_week', dayOfWeek)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No type errors in the new file.

---

## Task 6: CapacityDefaults component

**Files:**
- Create: `components/schedule/capacity-defaults.tsx`

This component renders a global default input plus 7 per-day inputs. Saves on blur.

- [ ] **Step 1: Create the file**

```tsx
'use client'
import { useState } from 'react'
import { ScheduleDefaults } from '@/lib/types'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  defaults: ScheduleDefaults
  onUpdate: (updated: ScheduleDefaults) => void
}

export function CapacityDefaults({ defaults, onUpdate }: Props) {
  const [globalVal, setGlobalVal] = useState(String(defaults.globalDefault))
  const [dayVals, setDayVals] = useState<Record<string, string>>(() => {
    const result: Record<string, string> = {}
    for (let d = 1; d <= 7; d++) {
      result[d] = defaults.dayDefaults[d] !== undefined ? String(defaults.dayDefaults[d]) : ''
    }
    return result
  })

  async function saveDefault(dayOfWeek: number | null, rawVal: string) {
    // Empty string on a per-day input = clear the override
    if (dayOfWeek !== null && rawVal === '') {
      await fetch('/api/schedule/defaults', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek }),
      })
      const updated = { ...defaults.dayDefaults }
      delete updated[String(dayOfWeek)]
      onUpdate({ ...defaults, dayDefaults: updated })
      return
    }

    const capacity = parseInt(rawVal)
    if (isNaN(capacity) || capacity < 1 || capacity > 200) return

    await fetch('/api/schedule/defaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayOfWeek, capacity }),
    })

    if (dayOfWeek === null) {
      onUpdate({ ...defaults, globalDefault: capacity })
    } else {
      onUpdate({
        ...defaults,
        dayDefaults: { ...defaults.dayDefaults, [String(dayOfWeek)]: capacity },
      })
    }
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Global default */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400 w-32">Global default</label>
        <input
          type="number"
          min={1}
          max={200}
          value={globalVal}
          onChange={e => setGlobalVal(e.target.value)}
          onBlur={() => saveDefault(null, globalVal)}
          className="w-20 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-yellow-500"
        />
        <span className="text-xs text-gray-500">spots per class (applies to all days unless overridden)</span>
      </div>

      {/* Per-day defaults */}
      <div className="flex gap-2 flex-wrap">
        {DAY_NAMES.map((name, i) => {
          const day = i + 1
          const isSet = dayVals[day] !== ''
          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <span className={`text-xs font-medium ${isSet ? 'text-yellow-400' : 'text-gray-500'}`}>{name}</span>
              <input
                type="number"
                min={1}
                max={200}
                placeholder="—"
                value={dayVals[day]}
                onChange={e => setDayVals(prev => ({ ...prev, [day]: e.target.value }))}
                onBlur={() => saveDefault(day, dayVals[day])}
                className={`w-14 bg-zinc-800 border rounded px-1 py-1 text-xs text-center focus:outline-none focus:border-yellow-500 ${
                  isSet ? 'border-yellow-600 text-yellow-400' : 'border-zinc-700 text-gray-500'
                }`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No type errors.

---

## Task 7: CapacityPopover component

**Files:**
- Create: `components/schedule/capacity-popover.tsx`

Small inline popover anchored to a cell. Contains capacity input + Remove class button.

- [ ] **Step 1: Create the file**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  templateId: string
  currentCapacity: number | null
  effectiveCapacity: number
  onSave: (capacity: number | null) => void
  onRemove: () => void
  onClose: () => void
}

export function CapacityPopover({
  templateId,
  currentCapacity,
  effectiveCapacity,
  onSave,
  onRemove,
  onClose,
}: Props) {
  const [val, setVal] = useState(
    currentCapacity !== null ? String(currentCapacity) : String(effectiveCapacity)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  async function handleSave() {
    const capacity = parseInt(val)
    if (isNaN(capacity) || capacity < 1 || capacity > 200) {
      setError('Must be 1–200')
      return
    }
    setSaving(true)
    const res = await fetch('/api/schedule/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: templateId, capacity }),
    })
    setSaving(false)
    if (!res.ok) { setError('Failed to save'); return }
    onSave(capacity)
    onClose()
  }

  async function handleRemove() {
    setSaving(true)
    await fetch('/api/schedule/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: templateId }),
    })
    setSaving(false)
    onRemove()
    onClose()
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-zinc-900 border border-zinc-600 rounded-lg shadow-xl p-3 w-48"
      style={{ top: '100%', left: '50%', transform: 'translateX(-50%)' }}
    >
      <p className="text-xs text-gray-400 mb-2">Spots for this slot</p>
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
      <button
        onClick={handleRemove}
        disabled={saving}
        className="w-full text-red-400 hover:text-red-300 text-xs py-1 disabled:opacity-50"
      >
        Remove class
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No type errors.

---

## Task 8: ScheduleGrid component

**Files:**
- Create: `components/schedule/schedule-grid.tsx`

The main grid. Rows = times, columns = days. Gold = active, dashed = empty. Handles cell clicks, toggle on/off, open popover. Includes "Add custom time" row.

- [ ] **Step 1: Create the file**

```tsx
'use client'
import { useState, useCallback } from 'react'
import { ScheduleTemplate, ScheduleDefaults } from '@/lib/types'
import { CapacityPopover } from './capacity-popover'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Default time slots: 6:00 AM – 9:00 PM, 30-min increments
function generateDefaultTimes(): string[] {
  const times: string[] = []
  for (let h = 6; h <= 21; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 21) times.push(`${String(h).padStart(2, '0')}:30`)
  }
  return times
}

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr)
  const m = mStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${ampm}`
}

function resolveCapacity(
  template: ScheduleTemplate | undefined,
  dayOfWeek: number,
  defaults: ScheduleDefaults
): number {
  if (template?.capacity !== null && template?.capacity !== undefined) return template.capacity
  const dayKey = String(dayOfWeek)
  if (defaults.dayDefaults[dayKey] !== undefined) return defaults.dayDefaults[dayKey]
  return defaults.globalDefault
}

interface PopoverState {
  templateId: string
  dayOfWeek: number
  localTime: string
}

interface Props {
  initialTemplates: ScheduleTemplate[]
  defaults: ScheduleDefaults
}

export function ScheduleGrid({ initialTemplates, defaults }: Props) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>(initialTemplates)
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [customTimes, setCustomTimes] = useState<string[]>([])
  const [newTimeInput, setNewTimeInput] = useState('')
  const [addError, setAddError] = useState('')

  // Build the set of time rows: default times + any custom times that have at least one template
  const templateTimes = new Set(templates.map(t => t.local_time))
  const allTimes = Array.from(new Set([
    ...generateDefaultTimes(),
    ...customTimes,
    ...Array.from(templateTimes).filter(t => !generateDefaultTimes().includes(t)),
  ])).sort()

  const getTemplate = useCallback(
    (dayOfWeek: number, localTime: string) =>
      templates.find(t => t.day_of_week === dayOfWeek && t.local_time === localTime),
    [templates]
  )

  async function handleCellClick(dayOfWeek: number, localTime: string) {
    const existing = getTemplate(dayOfWeek, localTime)
    if (existing) {
      // Open popover
      setPopover({ templateId: existing.id, dayOfWeek, localTime })
      return
    }
    // Toggle on: create template
    const res = await fetch('/api/schedule/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayOfWeek, localTime, capacity: null }),
    })
    const { template } = await res.json()
    setTemplates(prev => [...prev, template])
  }

  function handlePopoverSave(templateId: string, capacity: number | null) {
    setTemplates(prev =>
      prev.map(t => t.id === templateId ? { ...t, capacity } : t)
    )
  }

  function handlePopoverRemove(templateId: string) {
    // Derive remaining inside setTemplates to avoid stale closure on `templates`
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== templateId)
      if (popover) {
        const { localTime } = popover
        const remaining = updated.filter(t => t.local_time === localTime)
        if (remaining.length === 0 && !generateDefaultTimes().includes(localTime)) {
          setCustomTimes(ct => ct.filter(t => t !== localTime))
        }
      }
      return updated
    })
  }

  function handleAddCustomTime() {
    setAddError('')
    const normalized = newTimeInput.trim()
    if (!normalized.match(/^\d{1,2}:\d{2}$/)) {
      setAddError('Enter a time like 5:30 or 21:00')
      return
    }
    const [h, m] = normalized.split(':').map(Number)
    if (h < 0 || h > 23 || m !== 0 && m !== 30) {
      setAddError('Minutes must be :00 or :30')
      return
    }
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    if (allTimes.includes(formatted)) {
      setAddError('That time already exists')
      return
    }
    setCustomTimes(prev => [...prev, formatted])
    setNewTimeInput('')
  }

  return (
    <div className="overflow-x-auto">
      {/* Grid header */}
      <div className="grid min-w-[640px]" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
        <div /> {/* time label column */}
        {DAY_NAMES.map(name => (
          <div key={name} className="text-center text-xs font-semibold text-yellow-400 py-2 border-b border-zinc-700">
            {name}
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div className="min-w-[640px]">
        {allTimes.map(time => (
          <div
            key={time}
            className="grid items-center"
            style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}
          >
            <div className="text-right pr-3 text-xs text-gray-500 py-1">{formatTime(time)}</div>
            {[1, 2, 3, 4, 5, 6, 7].map(day => {
              const template = getTemplate(day, time)
              const isActive = !!template
              const effectiveCapacity = resolveCapacity(template, day, defaults)
              const isPopoverOpen =
                popover?.dayOfWeek === day && popover?.localTime === time

              return (
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
                  {isPopoverOpen && template && (
                    <CapacityPopover
                      templateId={template.id}
                      currentCapacity={template.capacity}
                      effectiveCapacity={effectiveCapacity}
                      onSave={cap => handlePopoverSave(template.id, cap)}
                      onRemove={() => handlePopoverRemove(template.id)}
                      onClose={() => setPopover(null)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Add custom time */}
      <div className="flex items-center gap-2 mt-4 min-w-[640px]">
        <div className="w-[72px]" />
        <input
          type="text"
          placeholder="e.g. 5:30"
          value={newTimeInput}
          onChange={e => { setNewTimeInput(e.target.value); setAddError('') }}
          onKeyDown={e => { if (e.key === 'Enter') handleAddCustomTime() }}
          className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white w-24 focus:outline-none focus:border-yellow-500"
        />
        <button
          onClick={handleAddCustomTime}
          className="text-xs text-yellow-400 hover:text-yellow-300 border border-zinc-600 hover:border-yellow-500 rounded px-3 py-1"
        >
          Add Row
        </button>
        {addError && <span className="text-xs text-red-400">{addError}</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No type errors.

---

## Task 9: Replace schedule/page.tsx

**Files:**
- Replace: `app/(owner)/schedule/page.tsx`

The existing list-based page is replaced with a client component that composes CapacityDefaults + ScheduleGrid.

- [ ] **Step 1: Replace the file content entirely**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { ScheduleTemplate, ScheduleDefaults } from '@/lib/types'
import { CapacityDefaults } from '@/components/schedule/capacity-defaults'
import { ScheduleGrid } from '@/components/schedule/schedule-grid'

export default function SchedulePage() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [defaults, setDefaults] = useState<ScheduleDefaults>({
    globalDefault: 20,
    dayDefaults: {},
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/schedule/templates')
      const data = await res.json()
      setTemplates(data.templates ?? [])
      setDefaults({
        globalDefault: data.globalDefault ?? 20,
        dayDefaults: data.dayDefaults ?? {},
      })
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-400 text-sm">Loading schedule...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Class Schedule</h1>
        <p className="text-sm text-yellow-400">↻ This schedule repeats every week automatically</p>
      </div>

      <CapacityDefaults defaults={defaults} onUpdate={setDefaults} />

      <ScheduleGrid
        initialTemplates={templates}
        defaults={defaults}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No type errors.

---

## Task 10: Smoke test on localhost

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

Expected: Server starts on localhost:3000 (or 3001).

- [ ] **Step 2: Log in as an owner and navigate to /schedule**

Expected: The grid renders with time rows (6:00 AM – 9:00 PM) and day columns (Mon–Sun). Gold cells for any existing active templates. Dashed cells for empty slots.

- [ ] **Step 3: Toggle a class on**

Click an empty dashed cell. Expected: Cell turns gold with a number (the effective capacity).

- [ ] **Step 4: Open the popover**

Click a gold cell. Expected: Popover appears with a capacity input and "Remove class" button.

- [ ] **Step 5: Set a per-slot capacity override**

Enter a number in the popover input, click Save. Expected: Cell shows the new number, popover closes.

- [ ] **Step 6: Remove a class**

Click a gold cell, click "Remove class". Expected: Cell returns to dashed state.

- [ ] **Step 7: Set a global default**

Change the global default input and tab away. Expected: All cells with no override show the new number.

- [ ] **Step 8: Add a custom time row**

Enter "5:30" in the Add Row input and click Add Row. Expected: A new 5:30 AM row appears at the top of the grid.

- [ ] **Step 9: Verify repeating banner**

Expected: "↻ This schedule repeats every week automatically" text visible above the grid.

---

## Task 11: Deploy to Vercel

- [ ] **Step 1: Deploy**

Run: `npx --cache /tmp/npm-cache vercel --prod`

Expected: Build succeeds and deployment URL printed.

- [ ] **Step 2: Smoke test on production URL**

Navigate to the production URL → log in as owner → visit /schedule.

Expected: Grid loads, interactions work (no console errors).
