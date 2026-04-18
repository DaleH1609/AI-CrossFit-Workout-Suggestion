'use client'
import { useState } from 'react'
import type { WorkoutDay, WorkoutPart } from '@/lib/types'

/**
 * State + submit logic for the workout-day edit modal. Extracted from
 * `components/workout/workout-edit-modal.tsx` so the view component is thin
 * and this form's behaviour can be unit-tested without the JSX.
 */
export interface UseWorkoutEditFormArgs {
  day: WorkoutDay
  weekId: string
  onSave: (updated: WorkoutDay) => void
  onClose: () => void
}

export function structuredToFreeText(day: WorkoutDay): string {
  const lines: string[] = []
  if (day.descriptor) lines.push(day.descriptor, '')
  for (const part of day.parts) {
    const label = part.label ? `${part.label}: ` : ''
    lines.push(`${label}${part.content}`)
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

export function freeTextToDay(text: string, original: WorkoutDay): WorkoutDay {
  const blocks = text.split(/\n{2,}/).map(b => b.trim()).filter(Boolean)
  let descriptor = original.descriptor ?? ''
  let startIndex = 0

  // Heuristic: if first block has no colon and no newline, treat as descriptor
  if (blocks.length > 0 && !blocks[0].includes('\n') && !blocks[0].includes(':')) {
    descriptor = blocks[0]
    startIndex = 1
  }

  const parts: WorkoutPart[] = blocks.slice(startIndex).map(block => {
    const colonIdx = block.indexOf(':')
    if (colonIdx !== -1) {
      return {
        label: block.slice(0, colonIdx).trim() || null,
        type: 'strength' as WorkoutPart['type'],
        content: block.slice(colonIdx + 1).trim(),
      }
    }
    return { label: null, type: 'strength' as WorkoutPart['type'], content: block }
  })

  return {
    day: original.day,
    descriptor,
    parts: parts.length > 0 ? parts : [{ label: null, type: 'strength', content: '' }],
  }
}

export function useWorkoutEditForm({ day, weekId, onSave, onClose }: UseWorkoutEditFormArgs) {
  const [mode, setMode] = useState<'structured' | 'freetext'>('structured')
  const [descriptor, setDescriptor] = useState(day.descriptor ?? '')
  const [parts, setParts] = useState<WorkoutPart[]>(day.parts.map(p => ({ ...p })))
  const [freeText, setFreeText] = useState('')
  const [warnSwitch, setWarnSwitch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function switchToFreeText() {
    const current: WorkoutDay = { day: day.day, descriptor, parts }
    setFreeText(structuredToFreeText(current))
    setMode('freetext')
    setWarnSwitch(false)
  }

  function switchToStructured() {
    if (!warnSwitch) {
      setWarnSwitch(true)
      return
    }
    const parsed = freeTextToDay(freeText, { day: day.day, descriptor, parts })
    setDescriptor(parsed.descriptor ?? '')
    setParts(parsed.parts)
    setMode('structured')
    setWarnSwitch(false)
  }

  function addPart() {
    setParts(prev => [...prev, { label: null, type: 'strength', content: '' }])
  }

  function removePart(idx: number) {
    if (parts.length <= 1) return
    setParts(prev => prev.filter((_, i) => i !== idx))
  }

  function movePart(idx: number, dir: -1 | 1) {
    const next = idx + dir
    if (next < 0 || next >= parts.length) return
    setParts(prev => {
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  function updatePart(idx: number, patch: Partial<WorkoutPart>) {
    setParts(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  async function save() {
    setSaving(true)
    setError(null)

    const updatedDay: WorkoutDay =
      mode === 'structured'
        ? { day: day.day, descriptor, parts }
        : freeTextToDay(freeText, { day: day.day, descriptor, parts })

    const res = await fetch(`/api/workouts/${weekId}/day`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayName: day.day, updatedDay }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError((data as { error?: string }).error || 'Save failed')
      setSaving(false)
      return
    }

    const data = (await res.json()) as { workouts?: WorkoutDay[] }
    const savedDay = data.workouts?.find(d => d.day === updatedDay.day) ?? updatedDay
    onSave(savedDay)
    onClose()
  }

  return {
    mode,
    descriptor,
    setDescriptor,
    parts,
    freeText,
    setFreeText,
    warnSwitch,
    setWarnSwitch,
    saving,
    error,
    switchToFreeText,
    switchToStructured,
    addPart,
    removePart,
    movePart,
    updatePart,
    save,
  }
}
