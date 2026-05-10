// app/api/push/subscribe/route.ts
// POST — save push subscription; DELETE — remove it
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return jsonError('User not found', 404)

  let body: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown }; userAgent?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.endpoint !== 'string') return jsonError('endpoint required')
  if (typeof body.keys?.p256dh !== 'string') return jsonError('p256dh required')
  if (typeof body.keys?.auth !== 'string') return jsonError('auth required')

  const { error } = await supabase.from('push_subscriptions').upsert({
    gym_id: (userData as unknown as { gym_id: string }).gym_id,
    user_id: user.id,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth_key: body.keys.auth,
    user_agent: typeof body.userAgent === 'string' ? body.userAgent : null,
  }, { onConflict: 'user_id,endpoint' })

  if (error) return jsonServerError('push/subscribe POST', error)
  return jsonOk({ subscribed: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  let body: { endpoint?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }
  if (typeof body.endpoint !== 'string') return jsonError('endpoint required')

  const { error } = await supabase.from('push_subscriptions')
    .delete().eq('user_id', user.id).eq('endpoint', body.endpoint)

  if (error) return jsonServerError('push/subscribe DELETE', error)
  return jsonOk({ unsubscribed: true })
}
