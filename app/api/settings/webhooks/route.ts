// app/api/settings/webhooks/route.ts
// GET  — list webhooks for admin's gym
// POST — create webhook
// DELETE ?id= — delete webhook
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

const VALID_PLATFORMS = ['slack', 'discord', 'custom']
const VALID_EVENTS = ['workout_published', 'booking_confirmed', 'booking_cancelled', 'new_member']

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (!data || data.role !== 'admin') return null
  return { gymId: data.gym_id as string }
}

export async function GET() {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { data, error } = await supabase
    .from('gym_webhooks')
    .select('id, platform, url, label, events, active, created_at')
    .eq('gym_id', admin.gymId)
    .order('created_at')

  if (error) return jsonServerError('webhooks GET', error)
  return jsonOk(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  let body: { platform?: unknown; url?: unknown; label?: unknown; events?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.platform !== 'string' || !VALID_PLATFORMS.includes(body.platform)) {
    return jsonError('platform must be slack, discord, or custom')
  }
  if (typeof body.url !== 'string' || !body.url.startsWith('https://')) {
    return jsonError('url must start with https://')
  }

  const events = Array.isArray(body.events)
    ? (body.events as unknown[]).filter((e): e is string => VALID_EVENTS.includes(e as string))
    : ['workout_published']

  if (events.length === 0) return jsonError('At least one valid event required')

  const { data, error } = await supabase.from('gym_webhooks').insert({
    gym_id: admin.gymId,
    platform: body.platform,
    url: body.url,
    label: typeof body.label === 'string' ? body.label.trim() : '',
    events,
  }).select().single()

  if (error) return jsonServerError('webhooks POST', error)
  return jsonOk(data)
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return jsonError('id required')

  const { error } = await supabase.from('gym_webhooks')
    .delete().eq('id', id).eq('gym_id', admin.gymId)

  if (error) return jsonServerError('webhooks DELETE', error)
  return jsonOk({ deleted: true })
}
