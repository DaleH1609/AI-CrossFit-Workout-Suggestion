// app/api/workouts/edits/route.ts
// POST — record that the coach edited a generated workout field
// GET  — fetch recent edits for context injection into AI prompts
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role, revoked_at').eq('id', user.id).single()
  if (!data || (data.role !== 'admin' && data.role !== 'owner')) return null
  if (data.revoked_at) return null
  return { gymId: data.gym_id as string }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  let body: { weekStart?: unknown; dayName?: unknown; field?: unknown; before?: unknown; after?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (
    typeof body.dayName !== 'string' ||
    typeof body.field !== 'string' ||
    typeof body.before !== 'string' ||
    typeof body.after !== 'string'
  ) {
    return jsonError('dayName, field, before, after required')
  }

  if (body.before === body.after) return jsonOk({ skipped: 'no change' })

  const { error } = await supabase.from('workout_edits').insert({
    gym_id: admin.gymId,
    week_start: body.weekStart,
    day_name: body.dayName,
    field: body.field,
    before_text: body.before,
    after_text: body.after,
  })

  if (error) return jsonServerError('workout-edits POST', error)
  return jsonOk({ recorded: true })
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50)

  const { data, error } = await supabase
    .from('workout_edits')
    .select('day_name, field, before_text, after_text, week_start, created_at')
    .eq('gym_id', admin.gymId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return jsonServerError('workout-edits GET', error)
  return jsonOk(data)
}
