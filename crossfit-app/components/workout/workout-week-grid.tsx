import { WorkoutCard } from './workout-card'
import { Skeleton } from '@/components/ui/skeleton'
import type { WorkoutWeek } from '@/lib/types'

export function WorkoutWeekGrid({ week, loading }: { week: WorkoutWeek | null; loading: boolean }) {
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
      {week.map((day, i) => <WorkoutCard key={i} day={day} />)}
    </div>
  )
}
