// app/api/workouts/[weekId]/extras/route.ts
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import type { WorkoutDay, WorkoutExtra } from '@/lib/types'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export async function PATCH(
  req: Request,
  { params }: { params: { weekId: string } }
) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  let body: { dayName?: string; extras?: WorkoutExtra[] }
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body')
  }
  const { dayName, extras } = body

  if (!dayName || typeof dayName !== 'string' || !Array.isArray(extras)) {
    return jsonError('dayName and extras are required')
  }

  const { data: week, error: fetchError } = await supabase
    .from('workout_weeks')
    .select('id, workouts, status')
    .eq('id', params.weekId)
    .eq('gym_id', userData.gym_id)
    .single()

  if (fetchError || !week) {
    return jsonError('Week not found', 404)
  }

  const workouts: WorkoutDay[] = week.workouts as WorkoutDay[]
  const idx = workouts.findIndex(d => d.day === dayName)
  if (idx === -1) {
    return jsonError(`Day "${dayName}" not found in this week`, 404)
  }

  const updatedWorkouts = [...workouts]
  updatedWorkouts[idx] = { ...updatedWorkouts[idx], extras }

  const { data: saved, error: updateError } = await supabase
    .from('workout_weeks')
    .update({ workouts: updatedWorkouts })
    .eq('id', params.weekId)
    .select('workouts')
    .single()

  if (updateError || !saved) {
    return jsonServerError('workouts/[weekId]/extras PATCH', updateError)
  }

  return jsonOk({ workouts: saved.workouts })
}
