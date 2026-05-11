// app/api/wod-posts/[id]/route.ts
// PATCH — update post (publish/unpublish or edit)
// DELETE — delete post
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === 'string') updates.title = body.title.trim()
  if (typeof body.bodyText === 'string') updates.body = body.bodyText.trim()
  if (typeof body.published === 'boolean') updates.published = body.published
  if (typeof body.workoutDate === 'string') updates.workout_date = body.workoutDate || null

  const { error } = await supabase.from('wod_posts')
    .update(updates)
    .eq('id', id)
    .eq('gym_id', admin.gymId)

  if (error) return jsonServerError('wod-posts PATCH', error)
  return jsonOk({ updated: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { error } = await supabase.from('wod_posts')
    .delete()
    .eq('id', id)
    .eq('gym_id', admin.gymId)

  if (error) return jsonServerError('wod-posts DELETE', error)
  return jsonOk({ deleted: true })
}
