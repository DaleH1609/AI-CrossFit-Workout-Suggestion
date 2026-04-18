'use client'
import { useEffect, useState } from 'react'
import type { MovementAnalysis } from '@/lib/types'

type PanelState =
  | { status: 'loading' }
  | { status: 'hidden' }
  | { status: 'ready'; data: MovementAnalysis }

const BALANCE_KEYS = ['push', 'pull', 'squat', 'hinge', 'carry'] as const
const BALANCE_MAX = 10

function BalanceBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min((value / BALANCE_MAX) * 100, 100)
  const color = pct > 70 ? 'bg-danger' : pct > 40 ? 'bg-accent' : 'bg-foreground-20'
  return (
    <div className="flex flex-col gap-1 min-w-0 flex-1">
      <div className="flex items-end justify-between mb-0.5">
        <span className="text-secondary text-[10px] uppercase tracking-wide capitalize">{label}</span>
        <span className="text-foreground text-[10px] font-medium tabular-nums">{value}</span>
      </div>
      <div className="h-10 flex items-end">
        <div
          className={`w-full rounded-sm transition-all duration-500 ${color}`}
          style={{ height: `${Math.max(pct, 8)}%` }}
        />
      </div>
    </div>
  )
}

export function MovementIntelligencePanel() {
  const [state, setState] = useState<PanelState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    type AnalysisResponse = MovementAnalysis & { insufficient_data?: boolean; error?: string | boolean }
    fetch('/api/workouts/movement-analysis', { signal: controller.signal })
      .then(async (r): Promise<AnalysisResponse | { error: true }> => {
        if (!r.ok) return { error: true }
        return r.json() as Promise<AnalysisResponse>
      })
      .then((data) => {
        if ('insufficient_data' in data && data.insufficient_data) {
          setState({ status: 'hidden' })
        } else if (data.error) {
          setState({ status: 'hidden' })
        } else {
          setState({ status: 'ready', data: data as MovementAnalysis })
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
      <div className="mb-6 p-5 bg-surface rounded-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2.5 w-2.5 rounded-full bg-accent-30 animate-pulse" />
          <div className="h-3 w-44 bg-foreground-10 rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          {Array(5).fill(null).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col gap-1">
              <div className="h-2 bg-foreground-10 rounded animate-pulse" />
              <div className="h-10 bg-foreground-10 rounded-sm animate-pulse" style={{ opacity: 0.4 + i * 0.1 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const { data } = state

  return (
    <div className="mb-6 p-5 bg-surface rounded-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <p className="text-secondary text-xs font-semibold uppercase tracking-widest">
            Movement Intelligence
          </p>
          <span className="text-secondary-40 text-xs">· Last {data.weeksAnalysed} weeks</span>
        </div>
        {(data.gaps.length > 0 || data.overused.length > 0) && (
          <span className="text-xs text-accent bg-accent-10 border border-accent-20 rounded-full px-2 py-0.5">
            {data.gaps.length + data.overused.length} alert{data.gaps.length + data.overused.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Balance bar chart */}
      <div className="flex gap-2 mb-4">
        {BALANCE_KEYS.map(key => (
          <BalanceBar key={key} label={key} value={data.balance[key] ?? 0} />
        ))}
      </div>

      {/* Alert tags */}
      {(data.gaps.length > 0 || data.overused.length > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border">
          {data.gaps.map(g => (
            <span
              key={g.movement}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-10 border border-accent-30 rounded-full text-accent text-xs"
            >
              ↓ {g.movement} <span className="opacity-60">· {g.daysSince}d</span>
            </span>
          ))}
          {data.overused.map(o => (
            <span
              key={o.movement}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-danger-10 border border-danger-30 rounded-full text-danger text-xs"
            >
              ↑ {o.movement} <span className="opacity-60">× {o.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
