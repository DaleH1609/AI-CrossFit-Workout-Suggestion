'use client'
import { useState, useEffect } from 'react'

interface MonthData { month: string; count: number }
interface YearData {
  year: number
  totalClasses: number
  favouriteDay: string | null
  favouriteTime: string | null
  longestStreak: number
  bestMonth: { month: string; count: number } | null
  monthlyBreakdown: MonthData[]
  memberSince: string | null
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function YearInReviewPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<YearData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setData(null)
    fetch(`/api/members/year-in-review?year=${year}`)
      .then(r => r.json())
      .then(r => { setData(r.data ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year])

  const maxMonthCount = data ? Math.max(...data.monthlyBreakdown.map(m => m.count), 1) : 1

  function formatTime(t: string | null) {
    if (!t) return null
    const [h] = t.split(':')
    const hour = parseInt(h, 10)
    if (isNaN(hour)) return t
    const suffix = hour >= 12 ? 'pm' : 'am'
    const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${display}:00 ${suffix}`
  }

  function formatMonth(mo: string | null | undefined) {
    if (!mo) return ''
    const [, m] = mo.split('-')
    return MONTH_LABELS[parseInt(m, 10) - 1] ?? mo
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Year in Review</h1>
          {data?.memberSince && (
            <p className="text-secondary text-sm mt-0.5">
              Member since {new Date(data.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="text-sm border border-border rounded px-2 py-1 bg-surface text-foreground"
        >
          {Array.from({ length: 3 }, (_, i) => currentYear - i).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-surface rounded-lg" />
            ))}
          </div>
          <div className="h-48 bg-surface rounded-lg" />
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6">
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-secondary uppercase tracking-wide mb-1">Classes</p>
              <p className="text-4xl font-bold text-foreground">{data.totalClasses}</p>
              <p className="text-xs text-secondary mt-1">in {year}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-secondary uppercase tracking-wide mb-1">Longest streak</p>
              <p className="text-4xl font-bold text-foreground">{data.longestStreak}</p>
              <p className="text-xs text-secondary mt-1">consecutive days</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-secondary uppercase tracking-wide mb-1">Favourite day</p>
              <p className="text-xl font-bold text-foreground leading-tight mt-1">
                {data.favouriteDay ?? '—'}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-secondary uppercase tracking-wide mb-1">Favourite time</p>
              <p className="text-xl font-bold text-foreground leading-tight mt-1">
                {formatTime(data.favouriteTime) ?? '—'}
              </p>
            </div>
          </div>

          {/* Best month callout */}
          {data.bestMonth && data.bestMonth.count > 0 && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-center gap-4">
              <div className="text-3xl">🏆</div>
              <div>
                <p className="text-sm font-semibold text-foreground">Best month: {formatMonth(data.bestMonth.month)}</p>
                <p className="text-secondary text-sm">{data.bestMonth.count} classes — your most active month this year</p>
              </div>
            </div>
          )}

          {/* Monthly bar chart */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-secondary uppercase tracking-wide mb-4">Monthly breakdown</p>
            <div className="flex items-end gap-1 h-32">
              {data.monthlyBreakdown.map((m, i) => {
                const pct = m.count === 0 ? 0 : Math.max(8, (m.count / maxMonthCount) * 100)
                const isBest = data.bestMonth?.month === m.month
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t transition-all ${isBest ? 'bg-accent' : 'bg-border'}`}
                      style={{ height: `${pct}%`, minHeight: m.count > 0 ? '4px' : '0' }}
                      title={`${MONTH_LABELS[i]}: ${m.count} classes`}
                    />
                    <span className="text-[9px] text-secondary">{MONTH_LABELS[i]}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Zero state */}
          {data.totalClasses === 0 && (
            <p className="text-center text-secondary text-sm py-4">
              No classes attended in {year}. Start booking to build your story!
            </p>
          )}

          {/* Share nudge */}
          {data.totalClasses > 0 && (
            <button
              onClick={async () => {
                const text = [
                  `My ${year} CrossFit year in review 🏋️`,
                  `${data.totalClasses} classes`,
                  data.longestStreak > 1 ? `${data.longestStreak}-day streak` : null,
                  data.favouriteDay ? `Favourite day: ${data.favouriteDay}` : null,
                ].filter(Boolean).join(' · ')
                if (navigator.share) {
                  await navigator.share({ title: `${year} Year in Review`, text }).catch(() => {})
                } else {
                  await navigator.clipboard.writeText(text).catch(() => {})
                }
              }}
              className="w-full py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-surface transition-colors"
            >
              Share my year →
            </button>
          )}
        </div>
      )}

      {!loading && !data && (
        <div className="text-center py-16 text-secondary text-sm">
          Could not load your year in review. Try again later.
        </div>
      )}
    </div>
  )
}
