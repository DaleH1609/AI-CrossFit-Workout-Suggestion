'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import type { WorkoutDay } from '@/lib/types'

export function WorkoutCard({ day }: { day: WorkoutDay }) {
  const [scalingOpen, setScalingOpen] = useState(false)

  return (
    <Card className="h-full">
      <div className="mb-3 pb-3 border-b border-accent-border">
        <h3 className="font-display text-white text-lg">{day.day}</h3>
        {day.descriptor && <span className="text-accent text-xs uppercase tracking-widest">{day.descriptor}</span>}
      </div>
      <div className="space-y-4">
        {day.parts.map((part, i) => (
          <div key={i}>
            {part.label && <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-1">{part.label}</p>}
            <pre className="text-white/90 text-sm font-body whitespace-pre-wrap leading-relaxed">{part.content}</pre>
          </div>
        ))}
        {day.parts.length === 0 && <p className="text-secondary text-sm">Rest Day</p>}
      </div>
      {day.scaling && (
        <div className="mt-4 pt-4 border-t border-accent-border">
          <button
            type="button"
            onClick={() => setScalingOpen(o => !o)}
            className="flex items-center gap-1 text-secondary text-xs hover:text-white transition-colors"
          >
            <span>Show scaling</span>
            <span className={`transition-transform ${scalingOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {scalingOpen && (
            <div className="mt-3 space-y-2">
              <div>
                <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-0.5">Rx</p>
                <p className="text-white/90 text-sm leading-relaxed">{day.scaling.rx}</p>
              </div>
              <div>
                <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-0.5">Scaled</p>
                <p className="text-white/90 text-sm leading-relaxed">{day.scaling.scaled}</p>
              </div>
              <div>
                <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-0.5">Beginner</p>
                <p className="text-white/90 text-sm leading-relaxed">{day.scaling.beginner}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
