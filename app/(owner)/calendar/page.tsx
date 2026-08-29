// app/(owner)/calendar/page.tsx
// 4-week macro view of programming
import { createClient } from '@/lib/supabase/server'
import type { WorkoutWeek, WorkoutDay } from '@/lib/types'

export const dynamic = 'force-dynamic'

function getMondaysBefore(count: number): string[] {
  const today = new Date()
  // Go back to most recent Monday
  const dow = today.getDay()
  const daysBack = dow === 0 ? 6 : dow - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysBack)
  const mondays: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(monday)
    d.setDate(monday.getDate() - i * 7)
    mondays.push(d.toISOString().split('T')[0])
  }
  return mondays
}

function getMondays(past: number, future: number): string[] {
  const pastMondays = getMondaysBefore(past)
  const lastMonday = pastMondays[pastMondays.length - 1]
  const futureMondays: string[] = []
  for (let i = 1; i <= future; i++) {
    const d = new Date(lastMonday)
    d.setDate(d.getDate() + i * 7)
    futureMondays.push(d.toISOString().split('T')[0])
  }
  return [...pastMondays, ...futureMondays]
}

const DAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function extractDayTitle(day: WorkoutDay): string {
  if (!day.parts || day.parts.length === 0) return day.descriptor ?? '—'
  const firstLine = day.parts[0].content.split('\n')[0].trim()
  return firstLine.slice(0, 40) || day.descriptor || '—'
}

interface WeekRow {
  week_start: string
  workouts: WorkoutWeek
  status: string
}

export default async function ProgrammingCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return null
  const gymId = (userData as unknown as { gym_id: string }).gym_id

  const mondays = getMondays(8, 4) // 8 past + current + 4 future = 12 weeks
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('workout_weeks')
    .select('week_start, workouts, status')
    .eq('gym_id', gymId)
    .in('week_start', mondays)

  const weekMap = new Map((data ?? []).map((w: WeekRow) => [w.week_start, w]))

  const months: { label: string; weeks: typeof mondays }[] = []
  let currentMonth = ''
  for (const monday of mondays) {
    const month = new Date(monday).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (month !== currentMonth) {
      months.push({ label: month, weeks: [] })
      currentMonth = month
    }
    months[months.length - 1].weeks.push(monday)
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground mb-8">Programming calendar</h1>

      <div className="space-y-10">
        {months.map(month => (
          <div key={month.label}>
            <h2 className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4">{month.label}</h2>
            <div className="space-y-3">
              {month.weeks.map(monday => {
                const week = weekMap.get(monday) as WeekRow | undefined
                const isCurrentWeek = monday <= today && today < (() => { const d = new Date(monday); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0] })()
                const isFuture = monday > today

                return (
                  <div key={monday}
                    className={`rounded-xl border p-4 transition-colors ${
                      isCurrentWeek ? 'border-accent-40 bg-accent-5'
                      : isFuture ? 'border-border bg-surface/50'
                      : 'border-border bg-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <p className={`text-sm font-semibold ${isCurrentWeek ? 'text-accent' : 'text-foreground'}`}>
                        Week of {new Date(monday).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                      {isCurrentWeek && (
                        <span className="text-[10px] bg-accent-15 text-accent px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">This week</span>
                      )}
                      {week && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ml-auto capitalize ${
                          week.status === 'published' ? 'bg-success/10 text-success'
                          : 'bg-surface border border-border text-secondary'
                        }`}>{week.status}</span>
                      )}
                    </div>

                    {week?.workouts ? (
                      <div className="grid grid-cols-7 gap-1">
                        {(week.workouts as WorkoutWeek).map((day, i) => (
                          <div key={day.day} className="min-w-0">
                            <p className="text-[9px] text-secondary uppercase tracking-wider mb-1">{DAY_SHORT[i]}</p>
                            <p className="text-[10px] text-foreground/70 leading-tight line-clamp-2" title={extractDayTitle(day)}>
                              {extractDayTitle(day)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-7 gap-1">
                        {DAY_SHORT.map((d, i) => (
                          <div key={i}>
                            <p className="text-[9px] text-secondary uppercase tracking-wider mb-1">{d}</p>
                            <div className={`h-3 rounded ${isFuture ? 'bg-border/30' : 'bg-border/50'}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
