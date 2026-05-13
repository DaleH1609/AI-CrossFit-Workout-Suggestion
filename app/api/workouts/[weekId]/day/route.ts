// app/api/workouts/[weekId]/day/route.ts
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { generateDayScaling } from '@/lib/claude/generate-workouts'
import type { WorkoutDay } from '@/lib/types'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { checkAiLimit, incrementAiCalls } from '@/lib/ai/spend-limit'
import { UUID_RE } from '@/lib/validation/z'

export const maxDuration = 60

export async function PATCH(req: Request, props: { params: Promise<{ weekId: string }> }) {
  const params = await props.params;
  if (!UUID_RE.test(params.weekId)) return jsonError('Invalid week id', 400)
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  let body: { dayName?: string; updatedDay?: WorkoutDay; skipScaling?: boolean }
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body')
  }
  const { dayName, updatedDay, skipScaling } = body

  if (!dayName || typeof dayName !== 'string' || !updatedDay || typeof updatedDay !== 'object') {
    return jsonError('dayName and updatedDay are required')
  }
  // Cap JSONB write size to prevent storage abuse
  if (JSON.stringify(updatedDay).length > 50_000) {
    return jsonError('Day data exceeds maximum allowed size')
  }

  // Fetch the week, verifying gym ownership — only draft weeks may be edited
  const { data: week, error: fetchError } = await supabase
    .from('workout_weeks')
    .select('id, workouts, status')
    .eq('id', params.weekId)
    .eq('gym_id', userData.gym_id)
    .eq('status', 'draft')
    .single()

  if (fetchError || !week) {
    return jsonError('Week not found or is not a draft', 404)
  }

  // Replace the matching day in the workouts JSONB array
  const workouts: WorkoutDay[] = week.workouts as WorkoutDay[]
  const idx = workouts.findIndex(d => d.day === dayName)
  if (idx === -1) {
    return jsonError(`Day "${dayName}" not found in this week`, 404)
  }

  // Regenerate scaling unless the client provided manual scaling
  let dayToSave = updatedDay
  if (!skipScaling) {
    const { limited: atLimit } = await checkAiLimit(userData.gym_id, supabase)
    if (atLimit) return jsonError('Monthly AI generation limit reached. Resets at the start of next month.', 429)
    try {
      const scaled = await generateDayScaling(updatedDay)
      dayToSave = scaled.day
      incrementAiCalls(userData.gym_id, supabase, { inputTokens: scaled.usage.inputTokens, outputTokens: scaled.usage.outputTokens })
        .catch(err => console.error('[day/route] incrementAiCalls failed', err))
    } catch {
      // Scaling failed — save without it
    }
  }

  const updatedWorkouts = [...workouts]
  updatedWorkouts[idx] = dayToSave

  const { data: saved, error: updateError } = await supabase
    .from('workout_weeks')
    .update({ workouts: updatedWorkouts })
    .eq('id', params.weekId)
    .select('workouts')
    .single()

  if (updateError || !saved) {
    return jsonServerError('workouts/[weekId]/day PATCH', updateError)
  }

  return jsonOk({ workouts: saved.workouts })
}
