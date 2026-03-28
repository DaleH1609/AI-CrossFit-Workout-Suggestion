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
      setPopover({ templateId: existing.id, dayOfWeek, localTime })
      return
    }
    const res = await fetch('/api/schedule/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayOfWeek, localTime, capacity: null }),
    })
    if (!res.ok) return
    const { template } = await res.json()
    if (template) setTemplates(prev => [...prev, template])
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
