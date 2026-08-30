// lib/claude/generate-workouts.ts
import { buildGenerationPrompt, buildRationalePrompt, buildMovementAnalysisPrompt, type EditEntry } from './prompts'
import { getAnthropicClient as getClient } from './client'
import type { WorkoutDay, WorkoutWeek, MovementAnalysis, RecentWeek, WorkoutRationale } from '@/lib/types'
import { MODEL_REASONING, MODEL_SUMMARY } from './models'

export function validateWorkoutWeek(data: unknown): data is WorkoutWeek {
  if (!Array.isArray(data)) return false
  if (data.length < 5) return false
  return data.every(
    (d) =>
      typeof d === 'object' &&
      d !== null &&
      typeof d.day === 'string' &&
      Array.isArray(d.parts) &&
      d.parts.every(
        (p: unknown) =>
          typeof p === 'object' &&
          p !== null &&
          typeof (p as Record<string, unknown>).content === 'string'
      )
  )
}

interface TokenUsage { inputTokens: number; outputTokens: number }

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return { inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens }
}

async function callClaude(prompt: string): Promise<{ result: WorkoutWeek | null; usage: TokenUsage }> {
  const client = getClient()
  const message = await client.messages.create({
    model: MODEL_REASONING,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  })

  const usage: TokenUsage = { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens }
  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return { result: null, usage }
    if (validateWorkoutWeek(parsed)) return { result: parsed, usage }
    // Accept partial results — keep individually-valid days, weekend fallback fills gaps
    const validDays = parsed.filter((d: unknown) =>
      typeof d === 'object' && d !== null &&
      typeof (d as Record<string, unknown>).day === 'string' &&
      Array.isArray((d as Record<string, unknown>).parts)
    )
    return { result: validDays.length >= 5 ? validDays as WorkoutWeek : null, usage }
  } catch {
    return { result: null, usage }
  }
}

export async function generateScaling(week: WorkoutWeek): Promise<{ workouts: WorkoutWeek; usage: TokenUsage }> {
  const client = getClient()
  const prompt = `You are a CrossFit and fitness scaling expert. Given the following 7-day workout week as JSON, return the exact same JSON array with a "scaling" object added to each day. The "scaling" object must have three fields: "rx" (Rx/as-prescribed version), "scaled" (scaled version for intermediate athletes), and "beginner" (beginner-friendly version). Each field should be a plain text string describing the scaling adjustments.

Input workout week:
${JSON.stringify(week, null, 2)}

Return ONLY a valid JSON array with the same structure but each day having an added "scaling" field. No markdown, no explanation, just the JSON.`

  const message = await client.messages.create({
    model: MODEL_REASONING,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const usage: TokenUsage = { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens }
  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  // Strip markdown code fences if present
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid scaling response structure')
  }
  // Only take the scaling field from Claude's response — preserve all original day data
  // This prevents Claude from accidentally stripping parts/content for any day
  const workouts = week.map(day => {
    const scaledDay = (parsed as WorkoutWeek).find(d => d.day === day.day)
    return scaledDay?.scaling ? { ...day, scaling: scaledDay.scaling } : day
  })
  return { workouts, usage }
}

export async function generateWorkouts(
  styleExamples: string[],
  history: WorkoutWeek[],
  gymType: 'crossfit' | 'hyrox' = 'crossfit',
  editHistory: EditEntry[] = []
): Promise<{ workouts: WorkoutWeek; usage: TokenUsage }> {
  const prompt = buildGenerationPrompt(styleExamples, history, gymType, editHistory)

  const first = await callClaude(prompt)
  if (first.result) return { workouts: first.result, usage: first.usage }

  const second = await callClaude(prompt)
  if (!second.result) throw new Error('Failed to generate valid workouts after 2 attempts')
  return { workouts: second.result, usage: addUsage(first.usage, second.usage) }
}

export async function generateRationale(
  week: WorkoutWeek,
  history: WorkoutWeek[],
  gymType: 'crossfit' | 'hyrox' = 'crossfit'
): Promise<{ rationale: WorkoutRationale | null; usage: TokenUsage }> {
  const client = getClient()
  const prompt = buildRationalePrompt(week, history, gymType)
  const zero: TokenUsage = { inputTokens: 0, outputTokens: 0 }

  try {
    const message = await client.messages.create({
      model: MODEL_SUMMARY,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const usage: TokenUsage = { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens }
    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    if (
      Array.isArray(parsed.bullets) &&
      parsed.bullets.length >= 2 &&
      typeof parsed.summary === 'string'
    ) {
      return { rationale: parsed as WorkoutRationale, usage }
    }
    return { rationale: null, usage }
  } catch {
    return { rationale: null, usage: zero }
  }
}


export async function generateDayScaling(day: WorkoutDay): Promise<{ day: WorkoutDay; usage: TokenUsage }> {
  const client = getClient()
  const prompt = `You are a CrossFit scaling expert. Given this single workout day as JSON, return the exact same object with a "scaling" field added. The "scaling" object must have three fields: "rx" (as-prescribed), "scaled" (intermediate), and "beginner". Each is a plain text string describing the adjustments.

Input:
${JSON.stringify(day, null, 2)}

Return ONLY valid JSON of the single day object with the scaling field added. No markdown, no explanation.`

  const message = await client.messages.create({
    model: MODEL_REASONING,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const usage: TokenUsage = { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens }
  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  try {
    const parsed = JSON.parse(text)
    return { day: parsed?.scaling ? { ...day, scaling: parsed.scaling } : day, usage }
  } catch {
    return { day, usage }
  }
}

function validateMovementAnalysis(data: unknown): data is MovementAnalysis {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    Array.isArray(d.gaps) &&
    Array.isArray(d.overused) &&
    typeof d.balance === 'object' && d.balance !== null &&
    typeof d.intensityDistribution === 'object' && d.intensityDistribution !== null &&
    typeof d.weeksAnalysed === 'number'
  )
}

export async function analyseMovementHistory(
  history: RecentWeek[]
): Promise<{ analysis: MovementAnalysis | null; usage: TokenUsage }> {
  const client = getClient()
  const prompt = buildMovementAnalysisPrompt(history)

  const message = await client.messages.create({
    model: MODEL_SUMMARY,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const usage: TokenUsage = { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens }
  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const parsed = JSON.parse(text)
    return { analysis: validateMovementAnalysis(parsed) ? parsed : null, usage }
  } catch {
    return { analysis: null, usage }
  }
}
