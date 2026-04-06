'use client'
import { useEffect, useState } from 'react'
import type { MovementAnalysis } from '@/lib/types'

type PanelState =
  | { status: 'loading' }
  | { status: 'hidden' }   // insufficient_data or error
  | { status: 'ready'; data: MovementAnalysis }

export function MovementIntelligencePanel() {
  const [state, setState] = useState<PanelState>({ status: 'loading' })

  useEffect(() => {
    fetch('/api/workouts/movement-analysis')
      .then(r => r.json())
      .then((data: MovementAnalysis & { insufficient_data?: boolean; error?: boolean }) => {
        if (data.insufficient_data || data.error) {
          setState({ status: 'hidden' })
        } else {
          setState({ status: 'ready', data })
        }
      })
      .catch(() => setState({ status: 'hidden' }))
  }, [])

  if (state.status === 'hidden') return null

  if (state.status === 'loading') {
    return (
      <div className="mb-4 p-4 bg-surface rounded-card border border-accent-border animate-pulse">
        <div className="h-3 w-40 bg-accent-border rounded mb-3" />
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-accent-border rounded" />
          <div className="h-6 w-32 bg-accent-border rounded" />
        </div>
      </div>
    )
  }

  const { data } = state

  return (
    <div className="mb-4 p-4 bg-surface rounded-card border border-accent-border">
      <p className="text-secondary text-xs font-medium uppercase tracking-wide mb-3">
        Programming Intelligence — Last {data.weeksAnalysed} weeks
      </p>

      {data.gaps.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {data.gaps.map(g => (
            <span
              key={g.movement}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-xs"
            >
              ⚠ {g.movement} · {g.daysSince}d ago
            </span>
          ))}
        </div>
      )}

      {data.overused.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {data.overused.map(o => (
            <span
              key={o.movement}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 border border-orange-500/30 rounded text-orange-400 text-xs"
            >
              ↑ {o.movement} × {o.count}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-4 mt-2">
        {Object.entries(data.balance).map(([key, count]) => (
          <span key={key} className="text-secondary text-xs capitalize">
            {key} <span className="text-white font-medium">{count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
