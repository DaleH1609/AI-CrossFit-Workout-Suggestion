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
    const controller = new AbortController()
    fetch('/api/workouts/movement-analysis', { signal: controller.signal })
      .then(r => r.json())
      .then((data: MovementAnalysis & { insufficient_data?: boolean; error?: boolean }) => {
        if (data.insufficient_data || data.error) {
          setState({ status: 'hidden' })
        } else {
          setState({ status: 'ready', data })
        }
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setState({ status: 'hidden' })
      })
    return () => controller.abort()
  }, [])

  if (state.status === 'hidden') return null

  if (state.status === 'loading') {
    return (
      <div className="mb-4 p-4 bg-surface rounded-card border border-border animate-shimmer">
        <div className="h-3 w-40 bg-foreground-10 rounded mb-3" />
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-foreground-10 rounded" />
          <div className="h-6 w-32 bg-foreground-10 rounded" />
        </div>
      </div>
    )
  }

  const { data } = state

  return (
    <div className="mb-4 p-4 bg-surface rounded-card border border-border">
      <p className="text-secondary text-xs font-medium uppercase tracking-wide mb-3">
        Programming Intelligence — Last {data.weeksAnalysed} weeks
      </p>

      {data.gaps.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {data.gaps.map(g => (
            <span
              key={g.movement}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-10 border border-accent-30 rounded text-accent text-xs"
            >
              <span aria-hidden="true">⚠</span> {g.movement} · {g.daysSince}d ago
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
              <span aria-hidden="true">↑</span> {o.movement} × {o.count}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-4 mt-2">
        {(['push', 'pull', 'squat', 'hinge', 'carry'] as const).map(key => (
          <span key={key} className="text-secondary text-xs capitalize">
            {key} <span className="text-foreground font-medium">{data.balance[key]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
