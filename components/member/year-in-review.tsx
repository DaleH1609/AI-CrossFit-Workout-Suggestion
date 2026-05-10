'use client'
import { useState, useEffect } from 'react'

interface YearData {
  year: number
  totalClasses: number
  favouriteDay: string | null
  favouriteTime: string | null
  longestStreak: number
  bestMonth: { month: string; count: number } | null
  monthlyBreakdown: { month: string; count: number }[]
}

const MONTH_ABBR = ['J','F','M','A','M','J','J','A','S','O','N','D']

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-3 bg-border rounded-sm overflow-hidden" style={{ height: 32 }}>
        <div
          className="w-full bg-accent rounded-sm transition-all duration-500"
          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
        />
      </div>
    </div>
  )
}

export function YearInReview() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<YearData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/members/year-in-review?year=${year}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year])

  if (loading) return <p className="text-secondary text-sm">Loading…</p>
  if (!data) return null

  const maxMonthly = Math.max(...data.monthlyBreakdown.map(m => m.count), 1)
  const bestMonthName = data.bestMonth
    ? new Date(data.bestMonth.month + '-15').toLocaleDateString('en-GB', { month: 'long' })
    : null

  return (
    <div className="space-y-6">
      {/* Year picker */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setYear(y => y - 1)}
          className="p-1.5 rounded text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
          aria-label="Previous year"
        >
          ‹
        </button>
        <span className="font-display text-lg text-foreground w-12 text-center">{year}</span>
        <button
          onClick={() => setYear(y => Math.min(y + 1, currentYear))}
          disabled={year >= currentYear}
          className="p-1.5 rounded text-secondary hover:text-foreground hover:bg-surface-raised transition-colors disabled:opacity-30"
          aria-label="Next year"
        >
          ›
        </button>
      </div>

      {data.totalClasses === 0 ? (
        <p className="text-secondary text-sm">No classes attended in {year}.</p>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Classes', value: data.totalClasses },
              { label: 'Longest streak', value: `${data.longestStreak}d` },
              { label: 'Favourite day', value: data.favouriteDay ?? '—' },
              { label: 'Best month', value: bestMonthName ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-surface p-3">
                <p className="font-display text-xl text-foreground">{value}</p>
                <p className="text-[10px] text-secondary uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Monthly bar chart */}
          <div>
            <p className="text-xs text-secondary uppercase tracking-wider mb-3">Classes per month</p>
            <div className="flex items-end gap-1">
              {data.monthlyBreakdown.map((m, i) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1" title={`${m.count} classes`}>
                  <MiniBar value={m.count} max={maxMonthly} />
                  <span className="text-[9px] text-secondary">{MONTH_ABBR[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
