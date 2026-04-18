'use client'
import { useState } from 'react'
import { WorkoutCard } from '@/components/workout/workout-card'
import { ClassTile } from '@/components/booking/class-tile'
import type { WorkoutDay } from '@/lib/types'

interface ClassInstance {
  id: string; date: string; local_time: string; starts_at: string; capacity: number; name?: string | null
}
interface BookingRow { id: string; instance_id: string; status: string }

interface Props {
  weekStart: string
  workouts: WorkoutDay[]
  instances: ClassInstance[]
  userBookings: BookingRow[]
  bookingCounts: Record<string, number>
  memberNames?: Record<string, string[]>
  waitlistEnabled?: boolean
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function WeekDayView({ weekStart, workouts, instances, userBookings, bookingCounts, memberNames, waitlistEnabled = true }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const todayIndex = DAY_NAMES.findIndex((_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0] === today
  })

  const [selectedIndex, setSelectedIndex] = useState(todayIndex >= 0 ? todayIndex : 0)

  const selectedDate = new Date(weekStart)
  selectedDate.setDate(selectedDate.getDate() + selectedIndex)
  const selectedDateStr = selectedDate.toISOString().split('T')[0]
  const isToday = selectedDateStr === today

  const selectedWorkout = workouts.find(w => w.day === DAY_NAMES[selectedIndex])
  const selectedInstances = instances.filter(i => i.date === selectedDateStr)

  return (
    <div>
      {/* Day pill selector — horizontally scrollable with a fade-right affordance */}
      <div className="relative mb-8">
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}
        role="tablist"
        aria-label="Scroll horizontally for more days"
      >
        {DAY_NAMES.map((dayName, i) => {
          const dayDate = new Date(weekStart)
          dayDate.setDate(dayDate.getDate() + i)
          const dateStr = dayDate.toISOString().split('T')[0]
          const isDayToday = dateStr === today
          const isSelected = i === selectedIndex
          const hasClasses = instances.some(inst => inst.date === dateStr)
          const hasBooking = userBookings.some(b =>
            b.status !== 'cancelled' && instances.find(inst => inst.id === b.instance_id && inst.date === dateStr)
          )

          return (
            <button
              key={dayName}
              onClick={() => setSelectedIndex(i)}
              className={`flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all duration-150 shrink-0 min-w-[56px] ${
                isSelected
                  ? 'bg-accent-15 border-accent-50'
                  : isDayToday
                  ? 'border-accent-25 hover:bg-accent-8 hover:border-accent-40'
                  : 'border-border hover:border-border hover:bg-surface'
              }`}
            >
              <span className={`text-xs font-medium uppercase tracking-wide ${
                isSelected ? 'text-accent' : isDayToday ? 'text-accent' : 'text-secondary'
              }`}>{DAY_SHORT[i]}</span>
              <span className={`text-lg font-bold tabular-nums leading-tight mt-0.5 ${
                isSelected ? 'text-accent' : isDayToday ? 'text-foreground' : 'text-foreground-70'
              }`}>{dayDate.getDate()}</span>
              {/* Dot: success if booked, dim if just has classes */}
              <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full mt-1 transition-colors ${
                hasBooking ? 'bg-success' : hasClasses ? 'bg-accent-40' : 'bg-transparent'
              }`} />
            </button>
          )
        })}
      </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-background to-transparent"
        />
      </div>

      {/* Selected day content */}
      <div>
        <div className="flex items-baseline gap-2 mb-4">
          <h2 className={`font-display text-2xl font-semibold ${isToday ? 'text-accent' : 'text-foreground'}`}>
            {DAY_NAMES[selectedIndex]}
          </h2>
          <span className="text-secondary text-sm">
            {selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
          </span>
          {isToday && <span className="text-xs bg-accent-15 text-accent px-2 py-0.5 rounded-full font-medium">Today</span>}
        </div>

        {!selectedWorkout && selectedInstances.length === 0 ? (
          <p className="text-secondary-60 text-sm italic">Rest day — no classes scheduled.</p>
        ) : (
          <div className="space-y-4">
            {selectedWorkout && <WorkoutCard day={selectedWorkout} isToday={isToday} />}
            <div>
              {selectedWorkout && (
                <p className="text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Classes</p>
              )}
              {selectedInstances.length === 0 ? (
                <p className="text-secondary-60 text-xs italic">No classes scheduled for today.</p>
              ) : (
                <div className="space-y-2">
                  {selectedInstances.map(inst => (
                    <ClassTile
                      key={inst.id}
                      instance={inst}
                      confirmedCount={bookingCounts[inst.id] ?? 0}
                      userBooking={userBookings.find(b => b.instance_id === inst.id) ?? null}
                      bookedMemberNames={memberNames?.[inst.id]}
                      waitlistEnabled={waitlistEnabled}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
