import { WorkoutCard } from './workout-card'
import { Skeleton } from '@/components/ui/skeleton'
import type { WorkoutDay, WorkoutWeek } from '@/lib/types'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function getTodayDayName() {
  const d = new Date()
  const js = d.getDay() // 0=Sun
  const idx = js === 0 ? 6 : js - 1
  return DAY_NAMES[idx]
}

interface WorkoutWeekGridProps {
  week: WorkoutWeek | null
  loading: boolean
  isDraft?: boolean
  onEdit?: (day: WorkoutDay) => void
  onEditScaling?: (day: WorkoutDay) => void
}

export function WorkoutWeekGrid({ week, loading, onEdit, onEditScaling }: WorkoutWeekGridProps) {
  const todayName = getTodayDayName()

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {Array(7).fill(null).map((_, i) => <Skeleton key={i} className="h-64" />)}
      </div>
    )
  }
  if (!week) {
    return (
      // Composed empty state rather than an emoji and two lines: it shows the
      // shape of what will appear here, so the screen reads as "not yet filled"
      // instead of "broken".
      <div className="rounded-card-lg border border-dashed border-border bg-surface/30 px-8 py-20 text-center">
        <div className="mx-auto mb-8 flex max-w-md items-end justify-center gap-2" aria-hidden="true">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => (
            <div key={d} className="flex-1">
              <div
                className="rounded-btn border border-border bg-surface-raised/60"
                style={{ height: `${34 + ((i * 13) % 30)}px` }}
              />
              <span className="mt-2 block font-mono text-[9px] uppercase tracking-[0.15em] text-secondary/40">{d}</span>
            </div>
          ))}
        </div>
        <h3 className="font-display uppercase tracking-tight text-2xl text-foreground">Nothing programmed yet</h3>
        <p className="mx-auto mt-3 max-w-sm text-sm text-secondary text-pretty">
          Generate a full week with AI in under 30 seconds, or build it yourself day by day.
        </p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {week.map((day, i) => (
        <div key={i} className="relative group transition-shadow duration-200 hover:shadow-[0_0_0_1px_var(--color-accent-30)] rounded-card">
          <WorkoutCard
            day={day}
            isToday={day.day === todayName}
            onEditScaling={onEditScaling ? () => onEditScaling(day) : undefined}
          />
          {onEdit && (
            <button
              onClick={() => onEdit(day)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-accent bg-surface border border-border rounded px-2 py-1 hover:bg-accent-10"
            >
              Edit
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
