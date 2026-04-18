'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { WorkoutDay, WorkoutPart } from '@/lib/types'
import { useWorkoutEditForm } from '@/lib/hooks/use-workout-edit-form'

const PART_TYPES: WorkoutPart['type'][] = [
  'strength', 'interval', 'amrap', 'fortime', 'partner', 'emom', 'rest',
]

interface WorkoutEditModalProps {
  day: WorkoutDay
  weekId: string
  onSave: (updated: WorkoutDay) => void
  onClose: () => void
}

export function WorkoutEditModal({ day, weekId, onSave, onClose }: WorkoutEditModalProps) {
  const {
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
  } = useWorkoutEditForm({ day, weekId, onSave, onClose })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, saving])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-card w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <h2 className="font-display text-xl text-foreground">Edit {day.day}</h2>
          <div className="flex items-center gap-3">
            {mode === 'structured' ? (
              <button
                type="button"
                className="text-sm text-secondary hover:text-foreground transition-colors"
                onClick={switchToFreeText}
              >
                Switch to free text
              </button>
            ) : (
              <button
                type="button"
                className="text-sm text-secondary hover:text-foreground transition-colors"
                onClick={switchToStructured}
              >
                Switch to structured
              </button>
            )}
            <button type="button" className="text-secondary hover:text-foreground transition-colors text-lg leading-none" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Warning banner */}
        {warnSwitch && mode === 'freetext' && (
          <div className="px-6 pt-4 flex-shrink-0">
            <div className="bg-accent-10 border border-accent-40 rounded-btn px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-accent text-sm">Switching back to structured may lose formatting. Click again to confirm.</p>
              <button type="button" className="text-accent hover:text-foreground text-xs flex-shrink-0" onClick={() => setWarnSwitch(false)}>
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
                  className="w-full bg-background border border-border rounded-btn px-3 py-2 text-foreground text-sm placeholder-secondary focus:outline-none focus:border-accent"
                />
              </div>

              {/* Parts */}
              {parts.map((part, idx) => (
                <div key={idx} className="border border-border rounded-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-secondary uppercase tracking-wider">Part {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-secondary hover:text-foreground text-xs px-1 disabled:opacity-30"
                        onClick={() => movePart(idx, -1)}
                        disabled={idx === 0}
                        title="Move up"
                        aria-label="Move part up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="text-secondary hover:text-foreground text-xs px-1 disabled:opacity-30"
                        onClick={() => movePart(idx, 1)}
                        disabled={idx === parts.length - 1}
                        title="Move down"
                        aria-label="Move part down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="text-danger hover:text-foreground text-xs px-2 py-1 rounded border border-danger disabled:opacity-30 transition-colors"
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
                        className="w-full bg-background border border-border rounded-btn px-3 py-2 text-foreground text-sm placeholder-secondary focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">Type</label>
                      <select
                        value={part.type}
                        onChange={e => updatePart(idx, { type: e.target.value as WorkoutPart['type'] })}
                        className="w-full bg-background border border-border rounded-btn px-3 py-2 text-foreground text-sm focus:outline-none focus:border-accent"
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
                      className="w-full bg-background border border-border rounded-btn px-3 py-2 text-foreground text-sm font-mono whitespace-pre-wrap focus:outline-none focus:border-accent resize-y"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="w-full border border-dashed border-border rounded-btn py-2 text-secondary hover:text-foreground hover:border-accent text-sm transition-colors"
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
                className="w-full bg-background border border-border rounded-btn px-3 py-2 text-foreground text-sm font-mono focus:outline-none focus:border-accent resize-y"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border flex-shrink-0">
          <div>
            {error && <p className="text-danger text-sm">{error}</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
