'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { WorkoutDay, WorkoutPart } from '@/lib/types'

const PART_TYPES: WorkoutPart['type'][] = [
  'strength', 'interval', 'amrap', 'fortime', 'partner', 'emom', 'rest',
]

interface WorkoutEditModalProps {
  day: WorkoutDay
  weekId: string
  onSave: (updated: WorkoutDay) => void
  onClose: () => void
}

function structuredToFreeText(day: WorkoutDay): string {
  const lines: string[] = []
  if (day.descriptor) lines.push(day.descriptor, '')
  for (const part of day.parts) {
    const label = part.label ? `${part.label}: ` : ''
    lines.push(`${label}${part.content}`)
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

function freeTextToDay(text: string, original: WorkoutDay): WorkoutDay {
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

export function WorkoutEditModal({ day, weekId, onSave, onClose }: WorkoutEditModalProps) {
  const [mode, setMode] = useState<'structured' | 'freetext'>('structured')
  const [descriptor, setDescriptor] = useState(day.descriptor ?? '')
  const [parts, setParts] = useState<WorkoutPart[]>(
    day.parts.map(p => ({ ...p }))
  )
  const [freeText, setFreeText] = useState('')
  const [warnSwitch, setWarnSwitch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

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
    setParts(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    let updatedDay: WorkoutDay
    if (mode === 'structured') {
      updatedDay = { day: day.day, descriptor, parts }
    } else {
      updatedDay = freeTextToDay(freeText, { day: day.day, descriptor, parts })
    }

    const res = await fetch(`/api/workouts/${weekId}/day`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayName: day.day, updatedDay }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Save failed')
      setSaving(false)
      return
    }

    onSave(updatedDay)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-surface border border-accent-border rounded-card w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-accent-border flex-shrink-0">
          <h2 className="font-display text-xl text-white">Edit {day.day}</h2>
          <div className="flex items-center gap-3">
            {mode === 'structured' ? (
              <button
                className="text-sm text-secondary hover:text-white transition-colors"
                onClick={switchToFreeText}
              >
                Switch to free text
              </button>
            ) : (
              <button
                className="text-sm text-secondary hover:text-white transition-colors"
                onClick={switchToStructured}
              >
                Switch to structured
              </button>
            )}
            <button className="text-secondary hover:text-white transition-colors text-lg leading-none" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Warning banner */}
        {warnSwitch && mode === 'freetext' && (
          <div className="px-6 pt-4 flex-shrink-0">
            <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-btn px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-yellow-300 text-sm">Switching back to structured may lose formatting. Click again to confirm.</p>
              <button className="text-yellow-300 hover:text-white text-xs flex-shrink-0" onClick={() => setWarnSwitch(false)}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {mode === 'structured' ? (
            <>
              {/* Descriptor */}
              <div>
                <label className="block text-xs text-secondary uppercase tracking-wider mb-1">Descriptor</label>
                <input
                  type="text"
                  value={descriptor}
                  onChange={e => setDescriptor(e.target.value)}
                  placeholder="e.g. Heavy lower + conditioning"
                  className="w-full bg-background border border-accent-border rounded-btn px-3 py-2 text-white text-sm placeholder-secondary focus:outline-none focus:border-accent"
                />
              </div>

              {/* Parts */}
              {parts.map((part, idx) => (
                <div key={idx} className="border border-accent-border rounded-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-secondary uppercase tracking-wider">Part {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-secondary hover:text-white text-xs px-1 disabled:opacity-30"
                        onClick={() => movePart(idx, -1)}
                        disabled={idx === 0}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        className="text-secondary hover:text-white text-xs px-1 disabled:opacity-30"
                        onClick={() => movePart(idx, 1)}
                        disabled={idx === parts.length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        className="text-danger hover:text-white text-xs px-2 py-1 rounded border border-danger disabled:opacity-30 transition-colors"
                        onClick={() => removePart(idx)}
                        disabled={parts.length <= 1}
                        title="Remove part"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-secondary mb-1">Label</label>
                      <input
                        type="text"
                        value={part.label ?? ''}
                        onChange={e => updatePart(idx, { label: e.target.value || null })}
                        placeholder="No label"
                        className="w-full bg-background border border-accent-border rounded-btn px-3 py-2 text-white text-sm placeholder-secondary focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">Type</label>
                      <select
                        value={part.type}
                        onChange={e => updatePart(idx, { type: e.target.value as WorkoutPart['type'] })}
                        className="w-full bg-background border border-accent-border rounded-btn px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
                      >
                        {PART_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-secondary mb-1">Content</label>
                    <textarea
                      value={part.content}
                      onChange={e => updatePart(idx, { content: e.target.value })}
                      rows={4}
                      className="w-full bg-background border border-accent-border rounded-btn px-3 py-2 text-white text-sm font-mono whitespace-pre-wrap focus:outline-none focus:border-accent resize-y"
                    />
                  </div>
                </div>
              ))}

              <button
                className="w-full border border-dashed border-accent-border rounded-btn py-2 text-secondary hover:text-white hover:border-accent text-sm transition-colors"
                onClick={addPart}
              >
                + Add Part
              </button>
            </>
          ) : (
            <div>
              <label className="block text-xs text-secondary uppercase tracking-wider mb-1">Free Text</label>
              <textarea
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                rows={20}
                className="w-full bg-background border border-accent-border rounded-btn px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-accent resize-y"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-accent-border flex-shrink-0">
          <div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
