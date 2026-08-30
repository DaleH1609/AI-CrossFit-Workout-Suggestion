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

  // p_rationale is passed explicitly even though it is always null here, and
  // that is load-bearing rather than tidiness. The database currently has two
  // overloads of save_workout_draft — a 3-argument one and a 4-argument one
  // whose p_rationale defaults to NULL — so a 3-argument call matches both and
  // PostgREST rejects it outright with PGRST203 rather than picking one. That
  // is what made this endpoint return 500 while /generate, which passes four
  // arguments, kept working. Migration 070 collapses the overload; until it is
  // applied, naming the fourth argument is what keeps this call resolvable.
  const { error } = await admin.rpc('save_workout_draft' as never, {
    p_gym_id: gymId,
    p_week_start: weekStart,
    p_workouts: workouts,
    p_rationale: null,
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
