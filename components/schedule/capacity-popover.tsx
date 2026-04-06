'use client'
import { useEffect, useRef, useState } from 'react'
import { ScheduleDefaults } from '@/lib/types'

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
  const [val, setVal] = useState(
    currentCapacity !== null ? String(currentCapacity) : String(effectiveCapacity)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const [overriding, setOverriding] = useState(currentCapacity !== null)
  const hasDayDefault = defaults.dayDefaults[String(dayOfWeek)] !== undefined
  const defaultLabel = hasDayDefault ? 'day default' : 'global'

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
    const res = await fetch('/api/schedule/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: templateId }),
    })
    setSaving(false)
    if (!res.ok) { setError('Failed to remove'); return }
    onRemove()
    onClose()
  }

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
            {currentCapacity !== null && (
              <button
                onClick={handleClearOverride}
                disabled={saving}
                className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
              >
                Clear override
              </button>
            )}
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
}
