'use client'
import { useState, useCallback, useRef, Fragment } from 'react'
import { Combobox } from '@/components/ui/combobox'
import type { ClassType, ScheduleDefaults, ScheduleTemplate } from '@/lib/types'
import { useToast } from '@/components/ui/toast'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mStr} ${ampm}`
}

function textColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#000000' : '#ffffff'
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

interface EditState {
  day: number
  time: string
  templateId: string
  classTypeId: string | null
  capacity: string
  overriding: boolean
  notes: string
  saved: boolean
  error: string
}

interface Props {
  initialTemplates: ScheduleTemplate[]
  defaults: ScheduleDefaults
  classTypes: ClassType[]
}

export function ScheduleGrid({ initialTemplates, defaults, classTypes }: Props) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>(
    initialTemplates.map(t => ({ ...t, local_time: t.local_time.slice(0, 5) }))
  )
  const [editState, setEditState] = useState<EditState | null>(null)
  const [defaultTypeId, setDefaultTypeId] = useState<string | null>(classTypes[0]?.id ?? null)
  const [editingCapacity, setEditingCapacity] = useState<{ templateId: string; value: string } | null>(null)
  const [customTimes, setCustomTimes] = useState<string[]>([])
  const [newTimeInput, setNewTimeInput] = useState('')
  const [addError, setAddError] = useState('')
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [showAllTimes, setShowAllTimes] = useState(false)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { toast } = useToast()

  const templateTimes = new Set(templates.map(t => t.local_time))
  const allTimes = Array.from(new Set([
    ...generateDefaultTimes(),
    ...customTimes,
    ...Array.from(templateTimes).filter(t => !generateDefaultTimes().includes(t)),
  ])).sort()

  // Rows that actually hold a class on some day. Collapsing to these turns a
  // 31-row grid into however many the gym really runs; the full range is one
  // click away for adding a slot at a new time.
  const usedTimes = allTimes.filter(t => templateTimes.has(t))
  const visibleTimes = showAllTimes || usedTimes.length === 0 ? allTimes : usedTimes
  const hiddenCount = allTimes.length - visibleTimes.length

  // Returns all templates at a given (day, time) — used for cell rendering
  const getTemplates = useCallback(
    (dayOfWeek: number, localTime: string) =>
      templates.filter(t => t.day_of_week === dayOfWeek && t.local_time === localTime),
    [templates]
  )

  // Returns first template at (day, time) — used for fill-row existence check
  const getTemplate = useCallback(
    (dayOfWeek: number, localTime: string) =>
      templates.find(t => t.day_of_week === dayOfWeek && t.local_time === localTime),
    [templates]
  )

  function resolveTypeColor(template: ScheduleTemplate): string {
    if (template.class_type_id) {
      return classTypes.find(t => t.id === template.class_type_id)?.color ?? '#eab308'
    }
    return template.name && template.name !== 'WOD' ? '#3b82f6' : '#eab308'
  }

  function resolveTypeName(template: ScheduleTemplate): string {
    if (template.class_type_id) {
      return classTypes.find(t => t.id === template.class_type_id)?.name ?? template.name
    }
    return template.name
  }

  // force=true skips the existence check, allowing a second tile at the same (day, time)
  async function callPost(day: number, time: string, force = false) {
    if (!force && getTemplate(day, time)) return
    const tempId = crypto.randomUUID()
    const activeType = classTypes.find(t => t.id === defaultTypeId) ?? classTypes[0] ?? null
    const optimistic: ScheduleTemplate = {
      id: tempId,
      day_of_week: day,
      local_time: time,
      capacity: null,
      active: true,
      name: activeType?.name ?? 'WOD',
      workout_notes: null,
      class_type_id: activeType?.id ?? null,
    }
    setTemplates(prev => [...prev, optimistic])

    // Every failure below must say something. Rolling the optimistic tile back
    // in silence is indistinguishable from the class spontaneously vanishing a
    // second after it was placed, which is exactly how this read when the API
    // was rejecting the request.
    try {
      const res = await fetch('/api/schedule/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayOfWeek: day,
          localTime: time,
          capacity: null,
          classTypeId: activeType?.id ?? null,
          name: activeType?.name ?? 'WOD',
        }),
      })
      if (!res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== tempId))
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Failed to add class', 'error')
        return
      }
      const { template } = await res.json()
      if (template) {
        setTemplates(prev => prev.map(t =>
          t.id === tempId ? { ...template, local_time: template.local_time.slice(0, 5) } : t
        ))
      }
    } catch (err) {
      // Without this the tile stayed on screen after a dropped connection and
      // looked saved, which is worse than losing it.
      console.error('[schedule-grid] add failed', err)
      setTemplates(prev => prev.filter(t => t.id !== tempId))
      toast('Network error - could not add class', 'error')
    }
  }

  async function callOverwrite(template: ScheduleTemplate, activeType: ClassType) {
    const snapshot = template
    setTemplates(prev => prev.map(t =>
      t.id === template.id ? { ...t, class_type_id: activeType.id, name: activeType.name } : t
    ))
    if (editState?.templateId === template.id) setEditState(null)
    try {
      const res = await fetch('/api/schedule/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: template.id,
          class_type_id: activeType.id,
          name: activeType.name,
          capacity: template.capacity,
          workout_notes: template.workout_notes,
        }),
      })
      if (!res.ok) {
        setTemplates(prev => prev.map(t => t.id === snapshot.id ? snapshot : t))
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Failed to update class', 'error')
      }
    } catch (err) {
      console.error('[schedule-grid] overwrite failed', err)
      setTemplates(prev => prev.map(t => t.id === snapshot.id ? snapshot : t))
      toast('Network error - could not update class', 'error')
    }
  }

  async function callDelete(templateId: string) {
    const snapshot = templates.find(t => t.id === templateId)
    setTemplates(prev => prev.filter(t => t.id !== templateId))
    if (editState?.templateId === templateId) setEditState(null)
    try {
      const res = await fetch('/api/schedule/templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId }),
      })
      if (!res.ok) {
        if (snapshot) setTemplates(prev => [...prev, snapshot])
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Failed to delete class', 'error')
      }
    } catch (err) {
      console.error('[schedule-grid] delete failed', err)
      if (snapshot) setTemplates(prev => [...prev, snapshot])
      toast('Network error - could not delete class', 'error')
    }
  }

  function openEdit(template: ScheduleTemplate, day: number) {
    const effectiveCap = resolveCapacity(template, day, defaults)
    setEditState({
      day,
      time: template.local_time,
      templateId: template.id,
      classTypeId: template.class_type_id,
      capacity: template.capacity !== null ? String(template.capacity) : String(effectiveCap),
      overriding: template.capacity !== null,
      notes: template.workout_notes ?? '',
      saved: false,
      error: '',
    })
  }

  async function autoSave(patch: Partial<EditState>, current: EditState) {
    const merged = { ...current, ...patch }
    const cap = merged.overriding ? parseInt(merged.capacity) : null
    if (merged.overriding && (isNaN(cap!) || cap! < 1 || cap! > 200)) {
      setEditState(prev => prev ? { ...prev, ...patch, error: 'Capacity must be 1-200', saved: false } : null)
      return
    }
    setEditState(prev => prev ? { ...prev, ...patch, error: '', saved: false } : null)
    const resolvedTypeId = merged.classTypeId ?? classTypes[0]?.id ?? null
    const resolvedName = classTypes.find(t => t.id === resolvedTypeId)?.name ?? 'WOD'
    const res = await fetch('/api/schedule/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: merged.templateId,
        capacity: cap,
        name: resolvedName,
        workout_notes: merged.notes.trim() || null,
        class_type_id: resolvedTypeId,
      }),
    })
    if (!res.ok) {
      // Surface why, rather than a bare "Failed to save" the user cannot act on.
      const data = await res.json().catch(() => ({}))
      setEditState(prev => prev ? { ...prev, error: data.error ?? 'Failed to save', saved: false } : null)
      return
    }
    setTemplates(prev => prev.map(t =>
      t.id === merged.templateId
        ? { ...t, capacity: cap, name: resolvedName, workout_notes: merged.notes.trim() || null, class_type_id: resolvedTypeId }
        : t
    ))
    setEditState(prev => prev ? { ...prev, saved: true, error: '' } : null)
  }

  function handleSlotClick(template: ScheduleTemplate, day: number) {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null
      const activeType = classTypes.find(t => t.id === defaultTypeId) ?? classTypes[0] ?? null
      if (activeType && template.class_type_id !== activeType.id) {
        callOverwrite(template, activeType)
      } else if (editState?.templateId === template.id) {
        setEditState(null)
      } else {
        openEdit(template, day)
      }
    }, 220)
  }

  // Fill-row: only fills completely empty cells (cells with any tile are skipped)
  function handleFillRow(time: string) {
    for (const day of [1, 2, 3, 4, 5, 6, 7]) {
      if (!getTemplate(day, time)) callPost(day, time)
    }
  }

  // Clear-row: removes every tile at this time across all days
  function handleClearRow(time: string) {
    const toRemove = templates.filter(t => t.local_time === time)
    if (toRemove.length === 0) return
    setTemplates(prev => prev.filter(t => t.local_time !== time))
    if (editState && toRemove.some(t => t.id === editState.templateId)) setEditState(null)
    for (const t of toRemove) {
      fetch('/api/schedule/templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id }),
      })
    }
  }

  function handleSlotDoubleClick(template: ScheduleTemplate) {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
    callDelete(template.id)
  }

  async function handleCapacitySave(template: ScheduleTemplate, value: string) {
    setEditingCapacity(null)
    const cap = parseInt(value)
    if (isNaN(cap) || cap < 1 || cap > 200) return
    const resolvedTypeId = template.class_type_id
    const resolvedName = classTypes.find(t => t.id === resolvedTypeId)?.name ?? template.name
    const res = await fetch('/api/schedule/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: template.id, capacity: cap, name: resolvedName, workout_notes: template.workout_notes, class_type_id: resolvedTypeId }),
    })
    if (res.ok) setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, capacity: cap } : t))
  }

  async function handleClearAll() {
    const snapshot = templates
    setTemplates([])
    setEditState(null)
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

  function handleAddCustomTime() {
    setAddError('')
    const normalized = newTimeInput.trim()
    if (!normalized.match(/^\d{1,2}:\d{2}$/)) {
      setAddError('Enter a time like 5:30 or 21:00')
      return
    }
    const [h, m] = normalized.split(':').map(Number)
    if (h < 0 || h > 23 || (m !== 0 && m !== 30)) {
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
    <div>
      {/* Controls: type selector + clear all */}
      {classTypes.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-secondary shrink-0">Adding as:</span>
          {classTypes.map(ct => {
            const isSelected = (defaultTypeId ?? classTypes[0]?.id) === ct.id
            return (
              <button
                key={ct.id}
                type="button"
                onClick={() => setDefaultTypeId(ct.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  isSelected
                    ? 'border-transparent'
                    : 'border-border text-secondary hover:text-foreground hover:border-accent bg-transparent'
                }`}
                style={isSelected ? { backgroundColor: ct.color, color: textColor(ct.color) } : undefined}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isSelected ? (textColor(ct.color) === '#000000' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)') : ct.color }}
                />
                {ct.name}
              </button>
            )
          })}
          <div className="ml-auto">
            {confirmingClear ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-secondary">Remove all?</span>
                <button type="button" onClick={handleClearAll} className="text-danger hover:text-foreground font-semibold">Yes</button>
                <button type="button" onClick={() => setConfirmingClear(false)} className="text-secondary hover:text-foreground">Cancel</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setEditState(null); setConfirmingClear(true) }}
                className="text-xs text-danger hover:text-foreground border border-border hover:border-danger rounded px-2 py-0.5 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid - WAI-ARIA grid role so screen readers recognise the layout */}
      <div
        role="grid"
        aria-label="Weekly class schedule"
        className={`overflow-x-auto select-none${confirmingClear ? ' opacity-40 pointer-events-none' : ''}`}
      >

        {/* Header */}
        <div role="row" className="grid min-w-[640px] mb-1" style={{ gridTemplateColumns: '72px repeat(7, 1fr) 36px' }}>
          <div role="columnheader" aria-label="Time" />
          {DAY_NAMES.map(name => (
            <div key={name} role="columnheader" className="text-center text-xs font-semibold text-accent py-2 border-b border-border">
              {name}
            </div>
          ))}
          <div role="columnheader" aria-label="Actions" />
        </div>

        {/* Row-collapse control. Empty rows are the bulk of this grid, so
            hiding them is the difference between scrolling past 31 rows and
            seeing the handful the gym actually runs. */}
        {(hiddenCount > 0 || showAllTimes) && (
          <div className="min-w-[640px] flex justify-end py-2">
            <button
              type="button"
              onClick={() => setShowAllTimes(v => !v)}
              aria-expanded={showAllTimes}
              className="font-mono text-[10px] uppercase tracking-[0.15em] text-secondary underline-offset-4 transition-colors duration-200 ease-expo hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-btn px-2 py-1"
            >
              {showAllTimes
                ? 'Show only scheduled times'
                : `Show all times (${hiddenCount} hidden)`}
            </button>
          </div>
        )}

        {/* Time rows */}
        <div className="min-w-[640px]">
          {visibleTimes.map(time => {
            const isEditingThisRow = editState?.time === time

            return (
              <Fragment key={time}>
                <div role="row" className="grid items-start" style={{ gridTemplateColumns: '72px repeat(7, 1fr) 36px' }}>

                  {/* Time label - top-aligned */}
                  <div role="rowheader" className="text-right pr-3 text-xs text-secondary flex justify-end pt-[22px]">
                    {formatTime(time)}
                  </div>

                  {/* Day cells - now support multiple stacked tiles */}
                  {[1, 2, 3, 4, 5, 6, 7].map(day => {
                    const cellTemplates = getTemplates(day, time)

                    return (
                      <div key={day} role="gridcell" className="p-0.5 flex flex-col gap-0.5">

                        {/* Existing tiles */}
                        {cellTemplates.map(template => {
                          const isEditing = editState?.templateId === template.id
                          const effectiveCapacity = resolveCapacity(template, day, defaults)
                          const color = resolveTypeColor(template)
                          const txt = textColor(color)
                          const name = resolveTypeName(template)

                          return (
                            <div
                              key={template.id}
                              className={`group relative w-full h-[60px] rounded px-2 py-1.5 cursor-pointer transition-all flex flex-col justify-between ${
                                isEditing
                                  ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-background scale-[1.03] z-10 shadow-lg shadow-black/40'
                                  : 'hover:scale-[1.04] hover:z-10 hover:shadow-xl hover:shadow-black/50'
                              }`}
                              style={{
                                // 14% tint rather than a solid fill, with the
                                // full-strength colour kept as a left spine.
                                backgroundColor: `color-mix(in srgb, ${color} 14%, var(--color-surface))`,
                                borderLeft: `3px solid ${color}`,
                                color: 'var(--color-foreground)',
                              }}
                              onClick={() => handleSlotClick(template, day)}
                              onDoubleClick={() => handleSlotDoubleClick(template)}
                            >
                              {/* Hover delete button */}
                              <button
                                type="button"
                                className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded text-[11px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/20 leading-none"
                                style={{ color: 'var(--color-foreground)' }}
                                onClick={e => { e.stopPropagation(); callDelete(template.id) }}
                                onDoubleClick={e => e.stopPropagation()}
                                aria-label={`Remove the ${name} class on ${DAY_NAMES[day]} at ${formatTime(time)}`}
                                title="Remove this slot"
                              >
                                ×
                              </button>

                              {/* Time inside tile */}
                              <div className="text-[9px] font-medium leading-none" style={{ color: 'var(--color-secondary)' }}>
                                {formatTime(time)}
                              </div>

                              {/* Class name */}
                              <div className="text-[11px] font-bold truncate leading-tight pr-3" style={{ color }}>
                                {name}
                              </div>

                              {/* Capacity - click to edit inline */}
                              {editingCapacity?.templateId === template.id ? (
                                <input
                                  autoFocus
                                  type="number"
                                  value={editingCapacity.value}
                                  onChange={e => setEditingCapacity(prev => prev ? { ...prev, value: e.target.value } : null)}
                                  onBlur={() => handleCapacitySave(template, editingCapacity.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleCapacitySave(template, editingCapacity.value)
                                    if (e.key === 'Escape') setEditingCapacity(null)
                                  }}
                                  onClick={e => e.stopPropagation()}
                                  onDoubleClick={e => e.stopPropagation()}
                                  className="block w-10 text-[9px] font-semibold bg-transparent border-b border-current/40 outline-none"
                                  style={{ color: 'var(--color-foreground)' }}
                                />
                              ) : (
                                <div
                                  className="text-[9px] font-medium cursor-text leading-none"
                                  style={{ color: 'var(--color-secondary)' }}
                                  onClick={e => {
                                    e.stopPropagation()
                                    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null }
                                    setEditingCapacity({ templateId: template.id, value: String(effectiveCapacity) })
                                  }}
                                  onDoubleClick={e => e.stopPropagation()}
                                >
                                  {effectiveCapacity} spots
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* Empty cell: full dashed button */}
                        {cellTemplates.length === 0 && (
                          <button
                            type="button"
                            onClick={() => callPost(day, time)}
                            aria-label={`Add a class on ${DAY_NAMES[day]} at ${formatTime(time)}`}
                            className="group/cell w-full h-[60px] rounded border border-transparent text-transparent transition-colors duration-200 ease-expo hover:border-dashed hover:border-accent/50 hover:bg-surface-raised/40 hover:text-accent focus-visible:border-dashed focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none"
                          >
                            +
                          </button>
                        )}

                        {/* Filled cell: thin "add another" button at bottom */}
                        {cellTemplates.length > 0 && (
                          <button
                            type="button"
                            onClick={() => callPost(day, time, true)}
                            aria-label={`Add another class on ${DAY_NAMES[day]} at ${formatTime(time)}`}
                            title="Add another class at this time"
                            className="w-full h-[18px] rounded border border-dashed border-border/50 hover:border-accent text-secondary/50 hover:text-accent text-[10px] transition-colors leading-none"
                          >
                            +
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {/* Row actions: fill + clear */}
                  <div className="flex flex-col items-center gap-1 pt-[18px]">
                    <button
                      type="button"
                      onClick={() => handleFillRow(time)}
                      aria-label={`Fill every empty slot at ${formatTime(time)}`}
                      title="Fill all empty slots in this row"
                      className="w-6 h-6 rounded border border-border hover:border-accent text-secondary hover:text-accent text-xs transition-colors flex items-center justify-center leading-none"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearRow(time)}
                      aria-label={`Remove every class at ${formatTime(time)}`}
                      title="Remove all slots in this row"
                      className="w-6 h-6 rounded border border-border hover:border-danger/60 text-secondary hover:text-danger text-xs transition-colors flex items-center justify-center leading-none"
                    >
                      −
                    </button>
                  </div>
                </div>

                {/* Inline edit bar */}
                {isEditingThisRow && editState && (
                  <div className="grid mb-1" style={{ gridTemplateColumns: '72px 1fr' }}>
                    <div />
                    <div className="border border-accent rounded-card bg-surface px-3 py-2 flex flex-wrap items-end gap-3">
                      {/* Class type */}
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        <label className="text-[10px] text-secondary uppercase tracking-wide">Class type</label>
                        <Combobox
                          ariaLabel="Class type"
                          value={editState.classTypeId ?? classTypes[0]?.id ?? null}
                          onChange={v => autoSave({ classTypeId: v, saved: false }, editState)}
                          options={classTypes.map(ct => ({ value: ct.id, label: ct.name }))}
                        />
                      </div>
                      {/* Capacity */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-secondary uppercase tracking-wide">Capacity</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={200}
                            value={editState.capacity}
                            onChange={e => setEditState(prev => prev ? { ...prev, capacity: e.target.value, overriding: true, saved: false, error: '' } : null)}
                            onBlur={() => editState && autoSave({ overriding: true }, editState)}
                            className="w-16 bg-background border border-border rounded-btn px-2 py-1 text-xs text-foreground text-center focus:outline-none focus:border-accent"
                          />
                          {editState.overriding && (
                            <button
                              type="button"
                              onClick={() => {
                                const t = templates.find(t => t.id === editState.templateId)
                                const effectiveCap = resolveCapacity(t, editState.day, defaults)
                                autoSave({ overriding: false, capacity: String(effectiveCap) }, editState)
                              }}
                              className="text-[10px] text-secondary hover:text-foreground"
                            >
                              Default
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Notes */}
                      <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                        <label className="text-[10px] text-secondary uppercase tracking-wide">Notes</label>
                        <input
                          type="text"
                          value={editState.notes}
                          onChange={e => setEditState(prev => prev ? { ...prev, notes: e.target.value, saved: false } : null)}
                          onBlur={() => editState && autoSave({}, editState)}
                          placeholder="Optional…"
                          className="bg-background border border-border rounded-btn px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
                        />
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-auto pb-0.5">
                        {editState.saved && <span className="text-[10px] text-success">✓ Saved</span>}
                        {editState.error && <span className="text-[10px] text-danger">{editState.error}</span>}
                        <button
                          onClick={() => callDelete(editState.templateId)}
                          className="text-[10px] text-danger border border-border hover:border-danger rounded px-2 py-0.5 transition-colors"
                        >
                          Remove
                        </button>
                        <button onClick={() => setEditState(null)} className="text-[10px] text-secondary hover:text-foreground">
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>

        {/* Add custom time row */}
        <div className="flex items-center gap-2 mt-4 min-w-[640px] select-text">
          <div className="w-[72px]" />
          <input
            type="time"
            value={newTimeInput}
            onChange={e => { setNewTimeInput(e.target.value); setAddError('') }}
            className="bg-background border border-border rounded-btn px-2 py-1 text-sm text-foreground w-28 focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleAddCustomTime}
            className="text-xs text-accent hover:text-foreground border border-border hover:border-accent rounded-btn px-3 py-1 transition-colors"
          >
            Add Row
          </button>
          {addError && <span className="text-xs text-danger">{addError}</span>}
        </div>
      </div>

      <p className="text-[10px] text-secondary mt-3">
        Click to place selected type · Click same type to edit · Hover tile for × to delete · Row − removes all slots at that time
      </p>
    </div>
  )
}
