// lib/types.ts
export interface WorkoutPart {
  label: string | null
  type: 'strength' | 'interval' | 'amrap' | 'fortime' | 'partner' | 'emom' | 'rest'
  content: string
}

export interface WorkoutDay {
  day: string
  descriptor?: string
  parts: WorkoutPart[]
}

export type WorkoutWeek = WorkoutDay[]
