// tests/lib/claude/generate-workouts.test.ts
import { describe, it, expect } from 'vitest'
import { generateWorkouts, validateWorkoutWeek } from '@/lib/claude/generate-workouts'

describe('validateWorkoutWeek', () => {
  it('returns true for valid week', () => {
    const week = [
      { day: 'Monday', parts: [{ label: 'Part A', type: 'strength', content: 'Deadlift' }] },
      { day: 'Tuesday', parts: [{ label: null, type: 'fortime', content: '21-15-9' }] },
      { day: 'Wednesday', parts: [{ label: null, type: 'strength', content: 'Back Squat' }] },
      { day: 'Thursday', parts: [{ label: null, type: 'partner', content: '28 min cap' }] },
      { day: 'Friday', parts: [{ label: 'Part A', type: 'strength', content: 'Press' }] },
    ]
    expect(validateWorkoutWeek(week)).toBe(true)
  })

  it('returns false for non-array', () => {
    expect(validateWorkoutWeek(null)).toBe(false)
    expect(validateWorkoutWeek({ day: 'Monday' })).toBe(false)
  })

  it('returns false if not 5 days', () => {
    expect(validateWorkoutWeek([{ day: 'Monday', parts: [] }])).toBe(false)
  })

  it('returns false if a day has no "day" string', () => {
    const bad = Array(5).fill(null).map((_, i) => ({
      day: i === 2 ? 123 : 'Day',
      parts: []
    }))
    expect(validateWorkoutWeek(bad)).toBe(false)
  })
})
