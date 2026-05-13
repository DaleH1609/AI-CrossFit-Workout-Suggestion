// app/api/wod-posts/route.ts
// GET  — list posts for admin's gym
// POST — create post
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role, revoked_at').eq('id', user.id).single()
  if (!data || data.role !== 'admin' && data.role !== 'owner') return null
  if (data.revoked_at) return null
  return { gymId: data.gym_id as string }
}

export async function GET() {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { data, error } = await supabase
    .from('wod_posts')
    .select('id, title, body, workout_date, published, created_at')
    .eq('gym_id', admin.gymId)
    .order('created_at', { ascending: false })

  if (error) return jsonServerError('wod-posts GET', error)
  return jsonOk(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  let body: { title?: unknown; bodyText?: unknown; workoutDate?: unknown; published?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.title !== 'string' || !body.title.trim()) return jsonError('title required')
  if (typeof body.bodyText !== 'string' || !body.bodyText.trim()) return jsonError('body required')

  const { data, error } = await supabase.from('wod_posts').insert({
    gym_id: admin.gymId,
    title: body.title.trim(),
    body: body.bodyText.trim(),
    workout_date: typeof body.workoutDate === 'string' && body.workoutDate ? body.workoutDate : null,
    published: body.published === true,
  }).select().single()

  if (error) return jsonServerError('wod-posts POST', error)
  return jsonOk(data)
}
