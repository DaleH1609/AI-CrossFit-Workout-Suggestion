import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { userData } = auth
  const gymId = userData.gym_id

  let body: { weekStart?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body')
  }
  const { weekStart } = body
  if (!weekStart || typeof weekStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return jsonError('weekStart must be YYYY-MM-DD')
  }
  // Must be a Monday
  const weekStartDate = new Date(weekStart + 'T00:00:00Z')
  if (Number.isNaN(weekStartDate.getTime()) || weekStartDate.getUTCDay() !== 1) {
    return jsonError('weekStart must be a Monday')
  }

  const workouts = DAYS.map(day => ({
    day,
    descriptor: '',
    parts: [{ label: null, type: 'strength', content: '' }],
  }))

  const admin = createAdminClient()

  const { error } = await admin.rpc('save_workout_draft' as never, {
    p_gym_id: gymId,
    p_week_start: weekStart,
    p_workouts: workouts,
  } as never)

  if (error) return jsonServerError('workouts/create-manual save_workout_draft', error)

  const { data: savedWeek } = await admin.from('workout_weeks')
    .select('id, workouts, status')
    .eq('gym_id', gymId)
    .eq('week_start', weekStart)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return jsonOk({ week: savedWeek ?? { workouts, status: 'draft' } })
}
