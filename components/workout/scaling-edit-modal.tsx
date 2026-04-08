'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { WorkoutDay, WorkoutScaling } from '@/lib/types'

interface ScalingEditModalProps {
  day: WorkoutDay
  weekId: string
  onSave: (updated: WorkoutDay) => void
  onClose: () => void
}

export function ScalingEditModal({ day, weekId, onSave, onClose }: ScalingEditModalProps) {
  const [scaling, setScaling] = useState<WorkoutScaling>(
    day.scaling ?? { rx: '', scaled: '', beginner: '' }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)

    const updatedDay: WorkoutDay = { ...day, scaling }

    const res = await fetch(`/api/workouts/${weekId}/day`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayName: day.day, updatedDay, skipScaling: true }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError((data as { error?: string }).error || 'Save failed')
      setSaving(false)
      return
    }

    const data = await res.json() as { workouts: WorkoutDay[] }
    const savedDay = data.workouts?.find(d => d.day === day.day) ?? updatedDay
    onSave(savedDay)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-surface border border-accent-border rounded-card w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-accent-border flex-shrink-0">
          <h2 className="font-display text-xl text-white">Edit Scaling — {day.day}</h2>
          <button className="text-secondary hover:text-white transition-colors text-lg leading-none" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {(['rx', 'scaled', 'beginner'] as const).map(level => (
            <div key={level}>
              <label className="block text-xs text-secondary uppercase tracking-wider mb-2">
                {level === 'rx' ? 'Rx (As Prescribed)' : level === 'scaled' ? 'Scaled' : 'Beginner'}
              </label>
              <textarea
                value={scaling[level]}
                onChange={e => setScaling(s => ({ ...s, [level]: e.target.value }))}
                rows={5}
                placeholder={`Enter ${level === 'rx' ? 'as-prescribed' : level} scaling notes…`}
                className="w-full bg-background border border-accent-border rounded-btn px-3 py-2 text-white text-sm focus:outline-none focus:border-accent resize-y placeholder-secondary"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-accent-border flex-shrink-0">
          <div>{error && <p className="text-red-400 text-sm">{error}</p>}</div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Scaling'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
