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
  extras?: WorkoutExtra[]   // optional, added manually by owner
}

export type WorkoutWeek = WorkoutDay[]

export interface WorkoutExtra {
  label: string
  content: string
}

export interface ClassType {
  id: string
  name: string
  color: string
}

export interface ScheduleTemplate {
  id: string
  day_of_week: number
  local_time: string
  capacity: number | null  // null = inherit from defaults
  active: boolean
  name: string
  workout_notes: string | null
  class_type_id: string | null
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

export interface RecentWeek {
  week_start: string
  workouts: WorkoutWeek
}

export interface MovementAnalysis {
  gaps: Array<{ movement: string; daysSince: number }>
  overused: Array<{ movement: string; count: number }>
  balance: { push: number; pull: number; squat: number; hinge: number; carry: number }
  intensityDistribution: { heavy_strength: number; conditioning: number; skill: number }
  weeksAnalysed: number
}

export interface ProgramDay {
  day: string
  content: string
}

export interface SpecialtyProgram {
  id: string
  gym_id: string
  name: string
  week_start: string
  days: ProgramDay[]
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}
