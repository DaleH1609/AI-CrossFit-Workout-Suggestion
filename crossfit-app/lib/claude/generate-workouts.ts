// lib/claude/generate-workouts.ts
import Anthropic from '@anthropic-ai/sdk'
import { buildGenerationPrompt } from './prompts'
import type { WorkoutWeek } from '@/lib/types'

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

export function validateWorkoutWeek(data: unknown): data is WorkoutWeek {
  if (!Array.isArray(data)) return false
  if (data.length !== 5) return false
  return data.every(
    (d) =>
      typeof d === 'object' &&
      d !== null &&
      typeof d.day === 'string' &&
      Array.isArray(d.parts)
  )
}

async function callClaude(prompt: string): Promise<WorkoutWeek | null> {
  const client = getClient()
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const parsed = JSON.parse(text)
    return validateWorkoutWeek(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function generateWorkouts(
  styleExamples: string[],
  history: WorkoutWeek[]
): Promise<WorkoutWeek> {
  const prompt = buildGenerationPrompt(styleExamples, history)

  const result = await callClaude(prompt)
  if (result) return result

  // One automatic retry
  const retry = await callClaude(prompt)
  if (retry) return retry

  throw new Error('Failed to generate valid workouts after 2 attempts')
}
