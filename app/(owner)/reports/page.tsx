'use client'
// app/(owner)/reports/page.tsx — Analytics dashboard
import { useState, useEffect } from 'react'

interface OverviewData {
  totalMembers: number
  newPerMonth: { month: string; count: number }[]
  attendancePerMonth: { month: string; count: number }[]
  leadFunnel: Record<string, number>
}

const LEAD_STATUSES = ['new', 'contacted', 'trial_booked', 'showed_up', 'joined', 'lost']
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Sparkline({ data, color = 'var(--accent)' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const w = 100, h = 36
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ReportsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [heatmap, setHeatmap] = useState<{ dow: number; hour: number; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [auditLog, setAuditLog] = useState<Array<{
    id: string; action: string; target_type: string | null; created_at: string
    users: { name: string | null; email: string } | null
  }>>([])
  const [feedbackSummary, setFeedbackSummary] = useState<Array<{
    instanceId: string; startsAt: string; localTime: string; avgRating: number; count: number
  }>>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/reports?type=overview').then(r => r.json()),
      fetch('/api/admin/reports?type=attendance_heatmap').then(r => r.json()),
      fetch('/api/admin/audit-log?limit=50').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/reports?type=feedback_summary').then(r => r.ok ? r.json() : []),
    ]).then(([ov, hm, al, fb]) => {
      setOverview(ov)
      setHeatmap(Array.isArray(hm) ? hm : [])
      setAuditLog(Array.isArray(al) ? al : [])
      setFeedbackSummary(Array.isArray(fb) ? fb : [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <h1 className="font-display uppercase text-foreground leading-[0.9] tracking-[-0.02em] text-[clamp(2rem,4vw,3rem)] mb-8">Reports</h1>
        <div className="text-secondary text-sm">Loading…</div>
      </div>
    )
  }

  // Build 12-month label array
  const now = new Date()
  const months12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return d.toISOString().slice(0, 7)
  })

  const newCounts = months12.map(m => overview?.newPerMonth.find(r => r.month === m)?.count ?? 0)
  const attCounts = months12.map(m => overview?.attendancePerMonth.find(r => r.month === m)?.count ?? 0)
  const monthLabels = months12.map(m => {
    const [y, mo] = m.split('-')
    return new Date(+y, +mo - 1, 1).toLocaleDateString('en-US', { month: 'short' })
  })

  // Heatmap grid: hours 5–21, all days
  const hours = Array.from({ length: 17 }, (_, i) => i + 5)
  const heatmapMap = new Map(heatmap.map(r => [`${r.dow}-${r.hour}`, r.count]))
  const maxHeat = Math.max(...heatmap.map(r => r.count), 1)

  const joined = overview?.leadFunnel?.joined ?? 0
  const totalLeads = LEAD_STATUSES.reduce((sum, s) => sum + (overview?.leadFunnel?.[s] ?? 0), 0)
  const conversionRate = totalLeads > 0 ? Math.round((joined / totalLeads) * 100) : 0

  return (
    <div>
      <h1 className="font-display uppercase text-foreground leading-[0.9] tracking-[-0.02em] text-[clamp(2rem,4vw,3rem)] mb-8">Reports</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-2xl font-bold text-foreground">{overview?.totalMembers ?? 0}</p>
          <p className="text-xs text-secondary mt-1 uppercase tracking-wider">Active Members</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-2xl font-bold text-foreground">{newCounts.reduce((a, b) => a + b, 0)}</p>
          <p className="text-xs text-secondary mt-1 uppercase tracking-wider">New (12 mo)</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-2xl font-bold text-foreground">{attCounts.reduce((a, b) => a + b, 0)}</p>
          <p className="text-xs text-secondary mt-1 uppercase tracking-wider">Bookings (12 mo)</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-2xl font-bold text-foreground">{conversionRate}%</p>
          <p className="text-xs text-secondary mt-1 uppercase tracking-wider">Lead → Member</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* New members trend */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">New Members / Month</h2>
          <Sparkline data={newCounts} />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-secondary">{monthLabels[0]}</span>
            <span className="text-[10px] text-secondary">{monthLabels[monthLabels.length - 1]}</span>
          </div>
        </div>

        {/* Bookings trend */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Bookings / Month</h2>
          <Sparkline data={attCounts} color="#22c55e" />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-secondary">{monthLabels[0]}</span>
            <span className="text-[10px] text-secondary">{monthLabels[monthLabels.length - 1]}</span>
          </div>
        </div>
      </div>

      {/* Lead funnel */}
      <div className="rounded-xl border border-border bg-surface p-5 mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-4">Lead funnel</h2>
        <div className="flex items-end gap-2">
          {LEAD_STATUSES.map((s, i) => {
            const count = overview?.leadFunnel?.[s] ?? 0
            const prev = i === 0 ? totalLeads : (overview?.leadFunnel?.[LEAD_STATUSES[i - 1]] ?? 0)
            const pct = prev > 0 ? Math.round((count / prev) * 100) : 0
            const label = s.replace('_', ' ')
            return (
              <div key={s} className="flex-1 text-center">
                <p className="text-lg font-bold text-foreground">{count}</p>
                <div className="w-full bg-border/30 rounded-full h-1.5 my-1">
                  <div
                    className="bg-accent h-1.5 rounded-full transition-all"
                    style={{ width: `${totalLeads > 0 ? (count / totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[9px] text-secondary capitalize">{label}</p>
                {i > 0 && <p className="text-[9px] text-accent">{pct}%</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Attendance heatmap */}
      <div className="rounded-xl border border-border bg-surface p-5 mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-4">Class Popularity Heatmap <span className="text-secondary text-xs font-normal">(last 90 days)</span></h2>
        <div className="overflow-x-auto">
          <table className="text-[9px] text-secondary w-full">
            <thead>
              <tr>
                <th className="pr-2 text-left font-normal w-8" />
                {DOW_LABELS.map(d => <th key={d} className="text-center font-normal px-0.5 w-9">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {hours.map(h => (
                <tr key={h}>
                  <td className="pr-2 text-right text-[9px] text-secondary">
                    {h % 12 === 0 ? 12 : h % 12}{h < 12 ? 'a' : 'p'}
                  </td>
                  {[0, 1, 2, 3, 4, 5, 6].map(d => {
                    const v = heatmapMap.get(`${d}-${h}`) ?? 0
                    const opacity = v === 0 ? 0.04 : 0.15 + (v / maxHeat) * 0.85
                    return (
                      <td key={d} className="p-0.5" title={`${v} bookings`}>
                        <div
                          className="w-full h-4 rounded-sm"
                          style={{ backgroundColor: `rgba(232, 93, 4, ${opacity})` }}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class feedback summary */}
      {feedbackSummary.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-6 mb-8">
          <h2 className="font-semibold text-foreground mb-4 text-sm">Class Ratings (last 30 days)</h2>
          <div className="space-y-2">
            {feedbackSummary.slice(0, 10).map(f => {
              const dt = new Date(f.startsAt)
              const label = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
              const time = new Date(`1970-01-01T${f.localTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              const stars = Math.round(f.avgRating)
              return (
                <div key={f.instanceId} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-[10px] text-secondary/60 tabular-nums shrink-0 w-32">{label} {time}</span>
                  <span className="text-accent text-xs tracking-wider">{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
                  <span className="text-xs text-secondary">{f.avgRating.toFixed(1)} / 5</span>
                  <span className="text-[10px] text-secondary/60">({f.count} {f.count === 1 ? 'rating' : 'ratings'})</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Audit log */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-semibold text-foreground mb-4 text-sm">Activity log</h2>
        {auditLog.length === 0 ? (
          <p className="text-secondary text-xs">No activity recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {auditLog.map(entry => {
              const actor = entry.users?.name ?? entry.users?.email ?? 'System'
              const action = entry.action.replace('.', ' ').replace('_', ' ')
              const dt = new Date(entry.created_at)
              const dateStr = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              return (
                <div key={entry.id} className="flex items-center gap-3 py-1 border-b border-border/40 last:border-0">
                  <span className="text-[10px] text-secondary/60 tabular-nums shrink-0 w-28">{dateStr} {timeStr}</span>
                  <span className="text-xs text-accent font-medium shrink-0 min-w-[120px]">{action}</span>
                  <span className="text-xs text-secondary truncate">{actor}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
