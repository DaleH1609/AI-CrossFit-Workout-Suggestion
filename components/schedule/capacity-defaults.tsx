'use client'
import { useState } from 'react'
import { ScheduleDefaults } from '@/lib/types'
import { useToast } from '@/components/ui/toast'

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
  const { toast } = useToast()

  async function saveDefault(dayOfWeek: number | null, rawVal: string) {
    // Empty string on a per-day input = clear the override
    if (dayOfWeek !== null && rawVal === '') {
      try {
        const res = await fetch('/api/schedule/defaults', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dayOfWeek }),
        })
        if (!res.ok) {
          toast('Failed to clear day default', 'error')
          return
        }
      } catch (err) {
        console.error('[capacity-defaults] delete failed', err)
        toast('Network error - could not clear default', 'error')
        return
      }
      const updated = { ...defaults.dayDefaults }
      delete updated[String(dayOfWeek)]
      onUpdate({ ...defaults, dayDefaults: updated })
      return
    }

    const capacity = parseInt(rawVal)
    if (isNaN(capacity) || capacity < 1 || capacity > 200) return

    try {
      const res = await fetch('/api/schedule/defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek, capacity }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Failed to save default capacity', 'error')
        return
      }
    } catch (err) {
      console.error('[capacity-defaults] save failed', err)
      toast('Network error - could not save default', 'error')
      return
    }

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
        <label className="text-sm text-secondary w-32">Global default</label>
        <input
          type="number"
          min={1}
          max={200}
          value={globalVal}
          onChange={e => setGlobalVal(e.target.value)}
          onBlur={() => saveDefault(null, globalVal)}
          className="w-20 bg-surface border border-border rounded px-2 py-1 text-sm text-foreground text-center focus:outline-none focus:border-accent"
        />
        <span className="text-xs text-secondary">spots per class (applies to all days unless overridden)</span>
      </div>

      {/* Per-day defaults */}
      <div className="flex gap-2 flex-wrap">
        {DAY_NAMES.map((name, i) => {
          const day = i + 1
          const isSet = dayVals[day] !== ''
          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <span className={`text-xs font-medium ${isSet ? 'text-accent' : 'text-secondary'}`}>{name}</span>
              <input
                type="number"
                min={1}
                max={200}
                placeholder="-"
                value={dayVals[day]}
                onChange={e => setDayVals(prev => ({ ...prev, [day]: e.target.value }))}
                onBlur={() => saveDefault(day, dayVals[day])}
                className={`w-14 bg-surface border rounded px-1 py-1 text-xs text-center focus:outline-none focus:border-accent ${
                  isSet ? 'border-accent text-accent' : 'border-border text-secondary'
                }`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
