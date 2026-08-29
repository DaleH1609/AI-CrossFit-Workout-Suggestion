'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import type { WorkoutDay } from '@/lib/types'

export function WorkoutCard({ day, onEditScaling, isToday }: { day: WorkoutDay; onEditScaling?: () => void; isToday?: boolean }) {
  const [scalingOpen, setScalingOpen] = useState(false)

  return (
    <Card className={`h-full ${isToday ? 'ring-1 ring-accent/40 shadow-[0_0_16px_rgba(198,242,78,0.08)]' : ''}`}>
      <div className="mb-3 pb-3 border-b border-border">
        <h3 className={`font-display text-lg ${isToday ? 'text-accent' : 'text-foreground'}`}>{day.day}</h3>
        {day.descriptor && (
          <span className="text-accent text-xs uppercase tracking-widest">{day.descriptor}</span>
        )}
      </div>
      <div className="space-y-3">
        {day.parts.map((part, i) => (
          <div key={i} className={i > 0 ? 'mt-1' : ''}>
            {part.label && (
              <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-1.5 pl-2 border-l border-accent">
                {part.label}
              </p>
            )}
            <p className="text-foreground text-sm whitespace-pre-wrap leading-relaxed">{part.content}</p>
          </div>
        ))}
        {day.parts.length === 0 && <p className="text-secondary text-sm">Rest Day</p>}
      </div>
      {day.scaling && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between gap-2 text-secondary">
            <button
              type="button"
              onClick={() => setScalingOpen(o => !o)}
              aria-expanded={scalingOpen}
              className="flex-1 flex items-center justify-between py-1 hover:text-foreground transition-colors text-left"
            >
              <span className="text-xs font-semibold uppercase tracking-wider">Scaling</span>
              <svg aria-hidden="true" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                className={`transition-transform duration-200 ${scalingOpen ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {onEditScaling && (
              <button
                type="button"
                onClick={onEditScaling}
                className="text-xs text-accent hover:text-foreground transition-colors"
              >
                Edit
              </button>
            )}
          </div>
          {scalingOpen && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-0.5 pl-2 border-l border-accent">Rx</p>
                <p className="text-foreground text-sm leading-relaxed">{day.scaling.rx}</p>
              </div>
              <div>
                <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-0.5 pl-2 border-l border-accent">Scaled</p>
                <p className="text-foreground text-sm leading-relaxed">{day.scaling.scaled}</p>
              </div>
              <div>
                <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-0.5 pl-2 border-l border-accent">Beginner</p>
                <p className="text-foreground text-sm leading-relaxed">{day.scaling.beginner}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
