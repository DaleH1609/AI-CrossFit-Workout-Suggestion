// app/api/admin/pauses/route.ts
// GET  ?memberId= — list pauses
// POST           — create pause
// DELETE ?id=    — delete pause
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { auditLog } from '@/lib/audit/gym-log'

export const dynamic = 'force-dynamic'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role, revoked_at').eq('id', user.id).single()
  if (!data || data.role !== 'admin' && data.role !== 'owner') return null
  if (data.revoked_at) return null
  return { gymId: data.gym_id as string, actorId: user.id }
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  if (!memberId) return jsonError('memberId required')

  const { data, error } = await supabase
    .from('membership_pauses')
    .select('id, pause_from, pause_to, reason, created_at')
    .eq('gym_id', admin.gymId)
    .eq('user_id', memberId)
    .order('pause_from', { ascending: false })

  if (error) return jsonServerError('pauses GET', error)
  return jsonOk(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  let body: { memberId?: unknown; pauseFrom?: unknown; pauseTo?: unknown; reason?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.memberId !== 'string') return jsonError('memberId required')
  if (typeof body.pauseFrom !== 'string' || typeof body.pauseTo !== 'string') {
    return jsonError('pauseFrom and pauseTo required')
  }
  if (body.pauseTo <= body.pauseFrom) return jsonError('pauseTo must be after pauseFrom')

  const { data, error } = await supabase.from('membership_pauses').insert({
    gym_id: admin.gymId,
    user_id: body.memberId,
    pause_from: body.pauseFrom,
    pause_to: body.pauseTo,
    reason: typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : null,
  }).select().single()

  if (error) return jsonServerError('pauses POST', error)

  auditLog({ gymId: admin.gymId, actorId: admin.actorId, action: 'member.pause', targetId: body.memberId, payload: { pauseFrom: body.pauseFrom, pauseTo: body.pauseTo } })

  return jsonOk(data)
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return jsonError('id required')

  const { error } = await supabase.from('membership_pauses')
    .delete().eq('id', id).eq('gym_id', admin.gymId)

  if (error) return jsonServerError('pauses DELETE', error)

  auditLog({ gymId: admin.gymId, actorId: admin.actorId, action: 'member.unpause', targetId: id })

  return jsonOk({ deleted: true })
}
