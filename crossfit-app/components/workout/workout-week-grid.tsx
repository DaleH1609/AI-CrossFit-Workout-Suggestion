import { WorkoutCard } from './workout-card'
import { Skeleton } from '@/components/ui/skeleton'
import type { WorkoutDay, WorkoutWeek } from '@/lib/types'

interface WorkoutWeekGridProps {
  week: WorkoutWeek | null
  loading: boolean
  isDraft?: boolean
  onEdit?: (day: WorkoutDay) => void
}

export function WorkoutWeekGrid({ week, loading, isDraft, onEdit }: WorkoutWeekGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {Array(5).fill(null).map((_, i) => <Skeleton key={i} className="h-64" />)}
      </div>
    )
  }
  if (!week) return null
  return (
    <div className="grid grid-cols-5 gap-4">
      {week.map((day, i) => (
        <div key={i} className="relative group">
          <WorkoutCard day={day} />
          {isDraft && onEdit && (
            <button
              onClick={() => onEdit(day)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-accent bg-surface border border-accent-border rounded px-2 py-1 hover:bg-accent/10"
            >
              Edit
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
