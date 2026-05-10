// GET — list member's goals
// POST — create goal
// PATCH ?id= — update goal (toggle achieved, etc.)
// DELETE ?id= — delete goal
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data, error } = await supabase
    .from('personal_goals')
    .select('id, title, target, achieved, achieved_at, due_date, created_at')
    .eq('user_id', user.id)
    .order('achieved').order('created_at', { ascending: false })

  if (error) return jsonServerError('goals GET', error)
  return jsonOk(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return jsonError('User not found', 404)

  let body: { title?: unknown; target?: unknown; dueDate?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.title !== 'string' || !body.title.trim()) return jsonError('title required')
  if (typeof body.target !== 'string' || !body.target.trim()) return jsonError('target required')

  const { data, error } = await supabase.from('personal_goals').insert({
    gym_id: (userData as unknown as { gym_id: string }).gym_id,
    user_id: user.id,
    title: body.title.trim(),
    target: body.target.trim(),
    due_date: typeof body.dueDate === 'string' && body.dueDate ? body.dueDate : null,
  }).select().single()

  if (error) return jsonServerError('goals POST', error)
  return jsonOk(data)
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return jsonError('id required')

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  const updates: Record<string, unknown> = {}
  if (typeof body.achieved === 'boolean') {
    updates.achieved = body.achieved
    updates.achieved_at = body.achieved ? new Date().toISOString() : null
  }

  if (Object.keys(updates).length === 0) return jsonError('Nothing to update')

  const { error } = await supabase.from('personal_goals')
    .update(updates).eq('id', id).eq('user_id', user.id)

  if (error) return jsonServerError('goals PATCH', error)
  return jsonOk({ updated: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return jsonError('id required')

  const { error } = await supabase.from('personal_goals')
    .delete().eq('id', id).eq('user_id', user.id)

  if (error) return jsonServerError('goals DELETE', error)
  return jsonOk({ deleted: true })
}
