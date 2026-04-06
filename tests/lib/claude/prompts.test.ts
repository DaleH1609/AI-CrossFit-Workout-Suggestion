import { describe, it, expect } from 'vitest'
import { buildGenerationPrompt, buildMovementAnalysisPrompt } from '@/lib/claude/prompts'
import type { WorkoutWeek, RecentWeek } from '@/lib/types'

const sampleWeek: WorkoutWeek = [
  { day: 'Monday', parts: [{ label: null, type: 'strength', content: 'Back Squat 5×5\nRest 2 min' }] },
  { day: 'Tuesday', parts: [{ label: null, type: 'fortime', content: '21-15-9 Thrusters, Pull-ups' }] },
  { day: 'Wednesday', parts: [{ label: null, type: 'strength', content: 'Deadlift 4×4' }] },
  { day: 'Thursday', parts: [{ label: null, type: 'partner', content: '30 min AMRAP' }] },
  { day: 'Friday', parts: [{ label: null, type: 'amrap', content: '20 min AMRAP: 5 pull-ups' }] },
]

describe('buildGenerationPrompt', () => {
  it('does not include JSON.stringify output in history section', () => {
    const prompt = buildGenerationPrompt([], [sampleWeek], 'crossfit')
    // Only check the history section — the output schema block contains "parts" and "label" legitimately
    const historySection = prompt.split('## Previous Weeks')[1].split('##')[0]
    expect(historySection).not.toContain('"parts"')
    expect(historySection).not.toContain('"label"')
  })

  it('includes periodization instructions', () => {
    const prompt = buildGenerationPrompt([], [sampleWeek], 'crossfit')
    expect(prompt.toLowerCase()).toContain('periodization')
  })

  it('includes movement content in readable form', () => {
    const prompt = buildGenerationPrompt([], [sampleWeek], 'crossfit')
    expect(prompt).toContain('Back Squat')
  })
})

describe('buildMovementAnalysisPrompt', () => {
  it('includes today date and week_start dates', () => {
    const history: RecentWeek[] = [
      { week_start: '2026-03-23', workouts: sampleWeek },
    ]
    const prompt = buildMovementAnalysisPrompt(history)
    expect(prompt).toContain('2026-03-23')
    expect(prompt).toContain(new Date().toISOString().split('T')[0])
  })

  it('includes movement content', () => {
    const history: RecentWeek[] = [
      { week_start: '2026-03-23', workouts: sampleWeek },
    ]
    const prompt = buildMovementAnalysisPrompt(history)
    expect(prompt).toContain('Back Squat')
  })

  it('includes weeksAnalysed count in schema comment', () => {
    const history: RecentWeek[] = [
      { week_start: '2026-03-23', workouts: sampleWeek },
      { week_start: '2026-03-30', workouts: sampleWeek },
    ]
    const prompt = buildMovementAnalysisPrompt(history)
    expect(prompt).toContain('2')
  })
})
