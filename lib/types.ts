// lib/types.ts
export interface WorkoutPart {
  label: string | null
  type: 'strength' | 'interval' | 'amrap' | 'fortime' | 'partner' | 'emom' | 'rest'
  content: string
}

export interface WorkoutScaling {
  rx: string
  scaled: string
  beginner: string
}

export interface WorkoutDay {
  day: string
  descriptor?: string
  parts: WorkoutPart[]
  scaling?: WorkoutScaling  // optional, added by post-processing
}

export type WorkoutWeek = WorkoutDay[]

export interface ScheduleTemplate {
  id: string
  day_of_week: number
  local_time: string
  capacity: number | null  // null = inherit from defaults
  active: boolean
}

export interface GymScheduleDefault {
  gym_id: string
  day_of_week: number | null  // null = global, 1-7 = per-day
  default_capacity: number
}

export interface ScheduleDefaults {
  globalDefault: number
  dayDefaults: Record<string, number>  // key = day_of_week as string (1–7)
}
