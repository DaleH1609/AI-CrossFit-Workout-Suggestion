// app/api/admin/members/notes/route.ts
// GET  ?memberId=  — list notes for a member
// POST             — create note
// DELETE ?id=      — delete note
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (!data || data.role !== 'admin') return null
  return { userId: user.id, gymId: data.gym_id as string }
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  if (!memberId) return jsonError('memberId required')

  const { data, error } = await supabase
    .from('member_notes')
    .select('id, body, created_at, coach_id')
    .eq('gym_id', admin.gymId)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) return jsonServerError('notes GET', error)
  return jsonOk(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  let body: { memberId?: unknown; text?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.memberId !== 'string' || typeof body.text !== 'string' || !body.text.trim()) {
    return jsonError('memberId and text required')
  }

  const { data, error } = await supabase.from('member_notes').insert({
    gym_id: admin.gymId,
    member_id: body.memberId,
    coach_id: admin.userId,
    body: body.text.trim(),
  }).select().single()

  if (error) return jsonServerError('notes POST', error)
  return jsonOk(data)
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return jsonError('id required')

  const { error } = await supabase.from('member_notes')
    .delete()
    .eq('id', id)
    .eq('gym_id', admin.gymId)

  if (error) return jsonServerError('notes DELETE', error)
  return jsonOk({ deleted: true })
}
