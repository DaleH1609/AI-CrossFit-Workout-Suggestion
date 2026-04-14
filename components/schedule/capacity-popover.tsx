'use client'
import { useEffect, useRef, useState } from 'react'
import type { ClassType, ScheduleDefaults } from '@/lib/types'

interface Props {
  templateId: string
  currentCapacity: number | null
  effectiveCapacity: number
  currentClassTypeId: string | null
  classTypes: ClassType[]
  currentNotes: string | null
  dayOfWeek: number
  defaults: ScheduleDefaults
  onSave: (capacity: number | null, classTypeId: string | null, workout_notes: string | null) => void
  onRemove: () => void
  onClose: () => void
}

export function CapacityPopover({
  templateId,
  currentCapacity,
  effectiveCapacity,
  currentClassTypeId,
  classTypes,
  currentNotes,
  dayOfWeek,
  defaults,
  onSave,
  onRemove,
  onClose,
}: Props) {
  const [capacity, setCapacity] = useState(
    currentCapacity !== null ? String(currentCapacity) : String(effectiveCapacity)
  )
  const [overriding, setOverriding] = useState(currentCapacity !== null)
  const [classTypeId, setClassTypeId] = useState<string | null>(currentClassTypeId)
  const [notes, setNotes] = useState(currentNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)
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

  const selectedType = classTypes.find(t => t.id === classTypeId) ?? classTypes[0] ?? null

  async function handleSave() {
    const cap = overriding ? parseInt(capacity) : null
    if (overriding && (isNaN(cap!) || cap! < 1 || cap! > 200)) {
      setError('Capacity must be 1–200')
      return
    }
    setSaving(true)
    const resolvedTypeId = classTypeId ?? classTypes[0]?.id ?? null
    const resolvedName = classTypes.find(t => t.id === resolvedTypeId)?.name ?? 'WOD'
    const res = await fetch('/api/schedule/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: templateId,
        capacity: overriding ? cap : null,
        name: resolvedName,
        workout_notes: notes.trim() || null,
        class_type_id: resolvedTypeId,
      }),
    })
    setSaving(false)
    if (!res.ok) { setError('Failed to save'); return }
    onSave(overriding ? cap! : null, resolvedTypeId, notes.trim() || null)
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

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-surface border border-border rounded-card shadow-xl p-3 w-64"
      style={{ top: '100%', left: '50%', transform: 'translateX(-50%)' }}
    >
      {/* Class type */}
      <div className="mb-3">
        <p className="text-xs text-secondary mb-1">Class type</p>
        {classTypes.length === 0 ? (
          <p className="text-xs text-secondary italic">No types yet — add them above the grid</p>
        ) : (
          <div className="flex flex-col gap-1">
            {classTypes.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setClassTypeId(type.id)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${
                  (classTypeId ?? classTypes[0]?.id) === type.id
                    ? 'bg-foreground-10 text-foreground'
                    : 'text-secondary hover:text-foreground hover:bg-foreground-10'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: type.color }}
                />
                {type.name}
                {(classTypeId ?? classTypes[0]?.id) === type.id && (
                  <span className="ml-auto text-xs text-accent">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Workout notes */}
      <div className="mb-3">
        <p className="text-xs text-secondary mb-1">
          Notes <span className="text-secondary">(optional)</span>
        </p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Bring your own program"
          rows={2}
          className="w-full bg-background border border-border rounded-btn px-2 py-1 text-sm text-foreground focus:outline-none focus:border-accent resize-none"
        />
      </div>

      {/* Capacity */}
      <div className="mb-3">
        <p className="text-xs text-secondary mb-1">Capacity</p>
        {!overriding ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground-70">
              {effectiveCapacity}{' '}
              <span className="text-xs text-secondary">({defaultLabel})</span>
            </span>
            <button
              type="button"
              onClick={() => setOverriding(true)}
              className="text-xs text-accent border border-border rounded px-2 py-0.5 hover:border-accent"
            >
              Override
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={200}
              value={capacity}
              onChange={e => { setCapacity(e.target.value); setError('') }}
              className="w-20 bg-background border border-border rounded-btn px-2 py-1 text-sm text-foreground text-center focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => { setOverriding(false); setCapacity(String(effectiveCapacity)) }}
              className="text-xs text-secondary hover:text-foreground"
            >
              Use {defaultLabel}
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-danger mb-2">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-accent hover:bg-accent-90 text-foreground text-xs font-semibold rounded-btn py-1.5 mb-2 disabled:opacity-50 transition-colors"
        style={selectedType ? { backgroundColor: selectedType.color } : undefined}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>

      <div className="border-t border-border pt-2">
        <button
          onClick={handleRemove}
          disabled={saving}
          className="w-full text-danger hover:text-foreground text-xs py-1 disabled:opacity-50 transition-colors"
        >
          Remove class
        </button>
      </div>
    </div>
  )
}
