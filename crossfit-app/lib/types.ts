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
