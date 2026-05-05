// app/api/workouts/[weekId]/extras/route.ts
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import type { WorkoutDay, WorkoutExtra } from '@/lib/types'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(req: Request, props: { params: Promise<{ weekId: string }> }) {
  const params = await props.params;
  if (!UUID_RE.test(params.weekId)) return jsonError('Invalid week id', 400)

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
  // Cap JSONB write size to prevent storage abuse
  if (JSON.stringify(extras).length > 50_000) {
    return jsonError('Extras data exceeds maximum allowed size')
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

  if (week.status !== 'draft') {
    return jsonError('Only draft weeks can be edited', 409)
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
