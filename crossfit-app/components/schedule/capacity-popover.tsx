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
