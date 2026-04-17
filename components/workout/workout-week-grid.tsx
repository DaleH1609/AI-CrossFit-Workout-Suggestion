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
  if (!week) return null
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
