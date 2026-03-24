import { Card } from '@/components/ui/card'
import type { WorkoutDay } from '@/lib/types'

export function WorkoutCard({ day }: { day: WorkoutDay }) {
  return (
    <Card className="h-full">
      <div className="mb-3 pb-3 border-b border-accent-border">
        <h3 className="font-display text-white text-lg">{day.day}</h3>
        {day.descriptor && <span className="text-accent text-xs uppercase tracking-widest">{day.descriptor}</span>}
      </div>
      <div className="space-y-4">
        {day.parts.map((part, i) => (
          <div key={i}>
            {part.label && <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-1">{part.label}</p>}
            <pre className="text-white/90 text-sm font-body whitespace-pre-wrap leading-relaxed">{part.content}</pre>
          </div>
        ))}
        {day.parts.length === 0 && <p className="text-secondary text-sm">Rest Day</p>}
      </div>
    </Card>
  )
}
