// app/api/feedback/route.ts
// POST — submit feedback for a class instance
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase
    .from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return jsonError('User not found', 404)

  let body: { instanceId?: unknown; rating?: unknown; comment?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.instanceId !== 'string') return jsonError('instanceId required')
  const rating = Number(body.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return jsonError('rating must be 1-5')

  const { error } = await supabase.from('class_feedback').upsert({
    gym_id: userData.gym_id,
    instance_id: body.instanceId,
    user_id: user.id,
    rating,
    comment: typeof body.comment === 'string' && body.comment.trim() ? body.comment.trim() : null,
  }, { onConflict: 'instance_id,user_id' })

  if (error) return jsonServerError('feedback POST', error)
  return jsonOk({ submitted: true })
}
