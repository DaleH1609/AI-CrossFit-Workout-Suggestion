// app/api/scores/route.ts
// POST: log/update a workout score; GET: fetch scores for a date (leaderboard)
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

const VALID_SCORE_TYPES = ['time', 'reps', 'weight', 'rounds_reps', 'distance', 'calories', 'pass_fail', 'notes_only'] as const
type ScoreType = typeof VALID_SCORE_TYPES[number]

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  const gymId = (userData as unknown as { gym_id: string } | null)?.gym_id
  if (!gymId) return jsonError('User not found', 404)

  let body: {
    workout_date?: unknown
    score_type?: unknown
    score_value?: unknown
    score_text?: unknown
    rx?: unknown
    notes?: unknown
    instance_id?: unknown
  }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  const { workout_date, score_type, score_value, score_text, rx, notes, instance_id } = body

  if (!workout_date || typeof workout_date !== 'string') return jsonError('workout_date required')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workout_date)) return jsonError('workout_date must be YYYY-MM-DD')
  if (!score_type || !VALID_SCORE_TYPES.includes(score_type as ScoreType)) {
    return jsonError(`score_type must be one of: ${VALID_SCORE_TYPES.join(', ')}`)
  }

  const payload = {
    gym_id: gymId,
    user_id: user.id,
    workout_date,
    score_type: score_type as ScoreType,
    score_value: typeof score_value === 'number' ? score_value : null,
    score_text: typeof score_text === 'string' ? score_text.trim().slice(0, 100) : null,
    rx: rx !== false,
    notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : null,
    instance_id: typeof instance_id === 'string' ? instance_id : null,
    updated_at: new Date().toISOString(),
  }

  // Upsert (one score per user per date)
  const { data, error } = await supabase.from('workout_scores')
    .upsert(payload, { onConflict: 'user_id,workout_date' })
    .select('id')
    .single()

  if (error) return jsonServerError('scores POST upsert', error)
  return jsonOk({ id: (data as unknown as { id: string }).id })
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const url = new URL(req.url)
  const date = url.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError('date param required (YYYY-MM-DD)')

  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  const gymId = (userData as unknown as { gym_id: string } | null)?.gym_id
  if (!gymId) return jsonError('User not found', 404)

  const { data: scores, error } = await supabase
    .from('workout_scores')
    .select('id, user_id, score_type, score_value, score_text, rx, notes, created_at, users(name)')
    .eq('gym_id', gymId)
    .eq('workout_date', date)
    .order('created_at', { ascending: true })

  if (error) return jsonServerError('scores GET', error)

  // Mark which score belongs to the requesting user
  const result = (scores ?? []).map((s: unknown) => ({
    ...(s as object),
    is_mine: (s as { user_id: string }).user_id === user.id,
  }))

  return jsonOk({ scores: result })
}
