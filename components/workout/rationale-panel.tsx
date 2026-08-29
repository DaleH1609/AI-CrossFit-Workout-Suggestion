'use client'
import { useState } from 'react'
import type { WorkoutRationale } from '@/lib/types'

interface RationalePanelProps {
  rationale: WorkoutRationale | null
}

export function RationalePanel({ rationale }: RationalePanelProps) {
  const [open, setOpen] = useState(false)

  if (!rationale) return null

  return (
    <div className="mb-6 rounded-lg border border-accent/20 bg-accent/5">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          {/* Spark icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-shrink-0" aria-hidden="true">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span className="text-sm font-semibold text-accent">Why this week?</span>
          <span className="text-sm text-secondary hidden sm:inline">- {rationale.summary}</span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-secondary transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-accent/10">
          <p className="text-sm text-secondary mt-3 mb-3 sm:hidden">{rationale.summary}</p>
          <ul className="space-y-2">
            {rationale.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-accent" aria-hidden="true" />
                <span className="text-sm text-foreground/80 leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
