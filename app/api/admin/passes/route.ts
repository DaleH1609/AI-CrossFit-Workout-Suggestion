// app/api/admin/passes/route.ts
// GET  ?memberId= — list passes for a member
// POST           — issue a new pass
// DELETE ?id=    — delete a pass
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (!data || data.role !== 'admin' && data.role !== 'owner') return null
  return { gymId: data.gym_id as string }
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  if (!memberId) return jsonError('memberId required')

  const { data, error } = await supabase
    .from('dropin_passes')
    .select('id, pass_type, uses_total, uses_used, expires_at, notes, created_at')
    .eq('gym_id', admin.gymId)
    .eq('user_id', memberId)
    .order('created_at', { ascending: false })

  if (error) return jsonServerError('passes GET', error)
  return jsonOk(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  let body: { memberId?: unknown; passType?: unknown; usesTotal?: unknown; expiresAt?: unknown; notes?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.memberId !== 'string') return jsonError('memberId required')
  if (body.passType !== 'dropin' && body.passType !== 'trial') return jsonError('passType must be dropin or trial')

  const uses = Number(body.usesTotal ?? 1)
  if (!Number.isInteger(uses) || uses < 1 || uses > 100) return jsonError('usesTotal must be 1-100')

  const { data, error } = await supabase.from('dropin_passes').insert({
    gym_id: admin.gymId,
    user_id: body.memberId,
    pass_type: body.passType,
    uses_total: uses,
    expires_at: typeof body.expiresAt === 'string' && body.expiresAt ? body.expiresAt : null,
    notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
  }).select().single()

  if (error) return jsonServerError('passes POST', error)
  return jsonOk(data)
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return jsonError('id required')

  const { error } = await supabase.from('dropin_passes')
    .delete().eq('id', id).eq('gym_id', admin.gymId)

  if (error) return jsonServerError('passes DELETE', error)
  return jsonOk({ deleted: true })
}
