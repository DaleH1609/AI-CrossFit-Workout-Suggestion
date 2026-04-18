'use client'
import { useState } from 'react'
import type { ClassType } from '@/lib/types'

/**
 * State + submit logic for the capacity popover. Extracted from
 * `components/schedule/capacity-popover.tsx` so the component can focus on
 * layout and the form behaviour is independently testable.
 *
 * Returns form state, mutators, a `save()` that PATCHes the template, and a
 * `remove()` that DELETEs it. Both surface any API failure via `error`.
 */
export interface UseCapacityFormArgs {
  templateId: string
  currentCapacity: number | null
  effectiveCapacity: number
  currentClassTypeId: string | null
  currentNotes: string | null
  classTypes: ClassType[]
  onSave: (capacity: number | null, classTypeId: string | null, workoutNotes: string | null) => void
  onRemove: () => void
  onClose: () => void
}

export function useCapacityForm({
  templateId,
  currentCapacity,
  effectiveCapacity,
  currentClassTypeId,
  currentNotes,
  classTypes,
  onSave,
  onRemove,
  onClose,
}: UseCapacityFormArgs) {
  const [capacity, setCapacity] = useState(
    currentCapacity !== null ? String(currentCapacity) : String(effectiveCapacity),
  )
  const [overriding, setOverriding] = useState(currentCapacity !== null)
  const [classTypeId, setClassTypeId] = useState<string | null>(currentClassTypeId)
  const [notes, setNotes] = useState(currentNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
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
    if (!res.ok) {
      setError('Failed to save')
      return
    }
    onSave(overriding ? cap! : null, resolvedTypeId, notes.trim() || null)
    onClose()
  }

  async function remove() {
    setSaving(true)
    const res = await fetch('/api/schedule/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: templateId }),
    })
    setSaving(false)
    if (!res.ok) {
      setError('Failed to remove')
      return
    }
    onRemove()
    onClose()
  }

  return {
    capacity,
    setCapacity,
    overriding,
    setOverriding,
    classTypeId,
    setClassTypeId,
    notes,
    setNotes,
    saving,
    error,
    setError,
    save,
    remove,
  }
}
