'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { ClassType, ScheduleDefaults, ScheduleTemplate } from '@/lib/types'
import { CapacityPopover } from './capacity-popover'

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

/** Returns black or white text depending on the background colour's luminance */
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

interface PopoverState {
  templateId: string
  dayOfWeek: number
  localTime: string
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
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [customTimes, setCustomTimes] = useState<string[]>([])
  const [newTimeInput, setNewTimeInput] = useState('')
  const [addError, setAddError] = useState('')
  const [confirmingClear, setConfirmingClear] = useState(false)

  const isDragging = useRef(false)
  const dragMode = useRef<'fill' | 'erase' | null>(null)
  const dragProcessed = useRef<Set<string>>(new Set())
  const dragCellCount = useRef(0)
  const eraseStartCell = useRef<{ day: number; time: string; templateId: string } | null>(null)
  const eraseStartFired = useRef(false)
  const templatesRef = useRef<ScheduleTemplate[]>([])

  useEffect(() => { templatesRef.current = templates }, [templates])

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

  function resolveTypeColor(template: ScheduleTemplate): string {
    if (template.class_type_id) {
      return classTypes.find(t => t.id === template.class_type_id)?.color ?? '#eab308'
    }
    // Fall back: non-WOD name = blue, WOD = yellow
    return template.name && template.name !== 'WOD' ? '#3b82f6' : '#eab308'
  }

  function resolveTypeName(template: ScheduleTemplate): string {
    if (template.class_type_id) {
      return classTypes.find(t => t.id === template.class_type_id)?.name ?? template.name
    }
    return template.name
  }

  async function callPost(day: number, time: string) {
    const tempId = crypto.randomUUID()
    const defaultType = classTypes[0] ?? null
    const optimistic: ScheduleTemplate = {
      id: tempId,
      day_of_week: day,
      local_time: time,
      capacity: null,
      active: true,
      name: defaultType?.name ?? 'WOD',
      workout_notes: null,
      class_type_id: defaultType?.id ?? null,
    }
    setTemplates(prev => [...prev, optimistic])
    const res = await fetch('/api/schedule/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayOfWeek: day,
        localTime: time,
        capacity: null,
        classTypeId: defaultType?.id ?? null,
        name: defaultType?.name ?? 'WOD',
      }),
    })
    if (!res.ok) {
      setTemplates(prev => prev.filter(t => t.id !== tempId))
      return
    }
    const { template } = await res.json()
    if (template) setTemplates(prev => prev.map(t => t.id === tempId ? {
      ...template,
      local_time: template.local_time.slice(0, 5),
    } : t))
  }

  async function callDelete(templateId: string, day: number, time: string) {
    setTemplates(prev => prev.filter(t => t.id !== templateId))
    const res = await fetch('/api/schedule/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: templateId }),
    })
    if (!res.ok) {
      const defaultType = classTypes[0] ?? null
      setTemplates(prev => [...prev, {
        id: templateId,
        day_of_week: day,
        local_time: time,
        capacity: null,
        active: true,
        name: defaultType?.name ?? 'WOD',
        workout_notes: null,
        class_type_id: defaultType?.id ?? null,
      }])
    }
  }

  function handlePopoverSave(templateId: string, capacity: number | null, classTypeId: string | null, workout_notes: string | null) {
    const name = classTypes.find(t => t.id === classTypeId)?.name ?? 'WOD'
    setTemplates(prev =>
      prev.map(t => t.id === templateId ? { ...t, capacity, name, workout_notes, class_type_id: classTypeId } : t)
    )
  }

  function handlePopoverRemove(templateId: string) {
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

  function handleDragMouseDown(e: React.MouseEvent, day: number, time: string) {
    e.preventDefault()
    setPopover(null)
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
  }

  function handleDragMouseEnter(day: number, time: string) {
    if (!isDragging.current) return
    const key = `${day}:${time}`
    if (dragProcessed.current.has(key)) return
    dragProcessed.current.add(key)
    dragCellCount.current++

    if (dragMode.current === 'fill') callPost(day, time)

    if (dragMode.current === 'erase') {
      if (!eraseStartFired.current && eraseStartCell.current) {
        eraseStartFired.current = true
        const s = eraseStartCell.current
        callDelete(s.templateId, s.day, s.time)
      }
      const template = templatesRef.current.find(
        t => t.day_of_week === day && t.local_time === time
      )
      if (template) callDelete(template.id, day, time)
    }
  }

  useEffect(() => {
    function handleMouseUp() {
      if (!isDragging.current) return
      const wasSingleCell = dragCellCount.current === 1
      const startedOnActive = dragMode.current === 'erase'
      const startCellNotDeleted = !eraseStartFired.current

      if (wasSingleCell && startedOnActive && startCellNotDeleted && eraseStartCell.current) {
        const { day, time } = eraseStartCell.current
        const template = templatesRef.current.find(
          t => t.day_of_week === day && t.local_time === time
        )
        if (template) setPopover({ templateId: template.id, dayOfWeek: day, localTime: time })
      }

      isDragging.current = false
      dragMode.current = null
      dragProcessed.current.clear()
      dragCellCount.current = 0
      eraseStartCell.current = null
      eraseStartFired.current = false
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [setPopover])

  return (
    <div className="overflow-x-auto select-none">
      {/* Grid header */}
      <div className="flex items-center justify-between mb-1 min-w-[640px]">
        <div className="grid flex-1" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
          <div />
          {DAY_NAMES.map(name => (
            <div key={name} className="text-center text-xs font-semibold text-accent py-2 border-b border-accent-border">
              {name}
            </div>
          ))}
        </div>
        {confirmingClear ? (
          <div className="flex items-center gap-2 text-xs shrink-0 ml-2">
            <span className="text-secondary">Remove all slots?</span>
            <button type="button" onClick={handleClearAll} className="text-danger hover:text-white font-semibold">Yes</button>
            <button type="button" onClick={() => setConfirmingClear(false)} className="text-secondary hover:text-white">Cancel</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setPopover(null); setConfirmingClear(true) }}
            className="text-xs text-danger hover:text-white border border-accent-border hover:border-danger rounded px-2 py-0.5 shrink-0 ml-2 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Grid body */}
      <div className={`min-w-[640px]${confirmingClear ? ' opacity-40 pointer-events-none' : ''}`}>
        {allTimes.map(time => (
          <div
            key={time}
            className="grid items-center"
            style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}
          >
            <div className="text-right pr-3 text-xs text-secondary py-1">{formatTime(time)}</div>
            {[1, 2, 3, 4, 5, 6, 7].map(day => {
              const template = getTemplate(day, time)
              const isActive = !!template
              const effectiveCapacity = resolveCapacity(template, day, defaults)
              const isPopoverOpen = popover?.dayOfWeek === day && popover?.localTime === time
              const cellColor = isActive ? resolveTypeColor(template!) : null
              const cellTextColor = cellColor ? textColor(cellColor) : undefined
              const displayName = isActive ? resolveTypeName(template!) : ''

              return (
                <div
                  key={day}
                  className="relative p-0.5"
                  onMouseDown={e => handleDragMouseDown(e, day, time)}
                  onMouseEnter={() => handleDragMouseEnter(day, time)}
                >
                  <button
                    type="button"
                    className={`w-full h-10 rounded text-xs font-medium transition-colors leading-tight px-1 ${
                      isActive
                        ? ''
                        : 'border border-dashed border-accent-border hover:border-accent text-transparent hover:text-secondary'
                    }`}
                    style={isActive ? {
                      backgroundColor: cellColor!,
                      color: cellTextColor,
                    } : undefined}
                  >
                    {isActive
                      ? <span className="truncate block">{displayName !== 'WOD' ? displayName : effectiveCapacity}</span>
                      : '+'}
                  </button>
                  {isPopoverOpen && template && (
                    <CapacityPopover
                      templateId={template.id}
                      currentCapacity={template.capacity}
                      effectiveCapacity={effectiveCapacity}
                      currentClassTypeId={template.class_type_id}
                      classTypes={classTypes}
                      currentNotes={template.workout_notes ?? null}
                      dayOfWeek={day}
                      defaults={defaults}
                      onSave={(cap, typeId, notes) => handlePopoverSave(template.id, cap, typeId, notes)}
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
      <div className="flex items-center gap-2 mt-4 min-w-[640px] select-text">
        <div className="w-[72px]" />
        <input
          type="time"
          value={newTimeInput}
          onChange={e => { setNewTimeInput(e.target.value); setAddError('') }}
          className="bg-background border border-accent-border rounded-btn px-2 py-1 text-sm text-white w-28 focus:outline-none focus:border-accent"
        />
        <button
          onClick={handleAddCustomTime}
          className="text-xs text-accent hover:text-white border border-accent-border hover:border-accent rounded-btn px-3 py-1 transition-colors"
        >
          Add Row
        </button>
        {addError && <span className="text-xs text-danger">{addError}</span>}
      </div>
    </div>
  )
}
