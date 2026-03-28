'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
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
  const [templates, setTemplates] = useState<ScheduleTemplate[]>(
    initialTemplates.map(t => ({ ...t, local_time: t.local_time.slice(0, 5) }))
  )
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [customTimes, setCustomTimes] = useState<string[]>([])
  const [newTimeInput, setNewTimeInput] = useState('')
  const [addError, setAddError] = useState('')

  // Drag-to-fill refs — all refs so values are current in async handlers
  const isDragging = useRef(false)
  const dragMode = useRef<'fill' | 'erase' | null>(null)
  const dragProcessed = useRef<Set<string>>(new Set())
  const dragCellCount = useRef(0)
  const eraseStartCell = useRef<{ day: number; time: string; templateId: string } | null>(null)
  const eraseStartFired = useRef(false)
  const templatesRef = useRef<ScheduleTemplate[]>([])

  useEffect(() => { templatesRef.current = templates }, [templates])

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
    if (template) setTemplates(prev => prev.map(t => t.id === tempId ? { ...template, local_time: template.local_time.slice(0, 5) } : t))
  }

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
      const template = templatesRef.current.find(
        t => t.day_of_week === day && t.local_time === time
      )
      if (template) callDelete(template.id, day, time)
    }
  }

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
  }, [setPopover]) // setPopover is stable; all other state is read via refs

  return (
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
                <div
                  key={day}
                  className="relative p-0.5"
                  onMouseDown={e => handleDragMouseDown(e, day, time)}
                  onMouseEnter={() => handleDragMouseEnter(day, time)}
                >
                  <button
                    type="button"
                    // TODO: add onKeyDown (Space/Enter) for keyboard-accessible cell toggle
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
      <div className="flex items-center gap-2 mt-4 min-w-[640px] select-text">
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
