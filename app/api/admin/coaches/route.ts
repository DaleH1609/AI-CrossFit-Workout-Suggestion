// app/api/admin/coaches/route.ts
// GET  — list coaches in gym
// POST — promote member to coach (or demote coach to member)
// PATCH ?userId= { coach_id } — assign/unassign coach to a class instance
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (!data || (data.role !== 'admin' && data.role !== 'owner')) return null
  return { gymId: data.gym_id as string }
}

// GET — list all coaches
export async function GET() {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { data, error } = await supabase.from('users')
    .select('id, name, email, role')
    .eq('gym_id', admin.gymId)
    .eq('role', 'coach')
    .order('name')

  if (error) return jsonServerError('admin/coaches GET', error)
  return jsonOk(data)
}

// POST { userId, role: 'coach' | 'member' } — promote/demote
export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  let body: { userId?: unknown; role?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.userId !== 'string') return jsonError('userId required')
  if (body.role !== 'coach' && body.role !== 'member') return jsonError('role must be coach or member')

  // Verify target user belongs to this gym
  const { data: target } = await supabase.from('users')
    .select('id, role').eq('id', body.userId).eq('gym_id', admin.gymId).single()
  if (!target) return jsonError('User not found', 404)
  if (target.role === 'admin' || target.role === 'owner') return jsonError('Cannot change role of admin/owner')

  const { error } = await createAdminClient()
    .from('users').update({ role: body.role }).eq('id', body.userId)

  if (error) return jsonServerError('admin/coaches POST', error)
  return jsonOk({ updated: true })
}

// PATCH — assign coach_id to a class_instance
// body: { instanceId, coachId: string | null }
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  let body: { instanceId?: unknown; coachId?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.instanceId !== 'string') return jsonError('instanceId required')
  const coachId = body.coachId === null ? null : typeof body.coachId === 'string' ? body.coachId : undefined
  if (coachId === undefined) return jsonError('coachId must be a UUID or null')

  // Verify instance belongs to gym
  const { data: instance } = await supabase.from('class_instances')
    .select('id').eq('id', body.instanceId).eq('gym_id', admin.gymId).single()
  if (!instance) return jsonError('Class not found', 404)

  // If assigning, verify coach belongs to gym
  if (coachId) {
    const { data: coach } = await supabase.from('users')
      .select('id').eq('id', coachId).eq('gym_id', admin.gymId).eq('role', 'coach').single()
    if (!coach) return jsonError('Coach not found', 404)
  }

  const { error } = await createAdminClient()
    .from('class_instances').update({ coach_id: coachId }).eq('id', body.instanceId)

  if (error) return jsonServerError('admin/coaches PATCH', error)
  return jsonOk({ updated: true })
}
