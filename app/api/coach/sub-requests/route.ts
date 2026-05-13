export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

async function requireCoach() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role, name, revoked_at').eq('id', user.id).single()
  const d = data as { gym_id: string; role: string; name: string; revoked_at: string | null } | null
  if (!d || !['coach', 'admin', 'owner'].includes(d.role ?? '')) return null
  if (d.revoked_at) return null
  return { userId: user.id, gymId: d.gym_id, name: d.name }
}

// GET — open sub requests for this gym (for coaches to claim)
export async function GET() {
  const auth = await requireCoach()
  if (!auth) return jsonError('Unauthorized', 401)

  try {
    const { data, error } = await createAdminClient()
      .from('sub_requests')
      .select(`
        id, status, note, created_at, instance_id,
        class_instances(starts_at, local_time, class_slot_templates(name)),
        requesting_coach:users!requesting_coach_id(id, name),
        claimed_by:users!claimed_by_coach_id(id, name)
      `)
      .eq('gym_id', auth.gymId)
      .in('status', ['open', 'claimed'])
      .order('created_at', { ascending: false })
    if (error) throw error
    return jsonOk(data ?? [])
  } catch (err) {
    return jsonServerError('Failed to load sub requests', err)
  }
}

// POST — create a sub request for an assigned class instance
export async function POST(req: Request) {
  const auth = await requireCoach()
  if (!auth) return jsonError('Unauthorized', 401)

  const body = await req.json().catch(() => ({}))
  const { instanceId, note } = body as { instanceId?: string; note?: string }
  if (!instanceId) return jsonError('instanceId is required')

  const supabase = createAdminClient()

  // Verify instance belongs to this gym and is assigned to this coach
  const { data: instance } = await supabase
    .from('class_instances')
    .select('id, coach_id, starts_at')
    .eq('id', instanceId)
    .eq('gym_id', auth.gymId)
    .single()

  if (!instance) return jsonError('Class not found', 404)
  const inst = instance as { id: string; coach_id: string | null; starts_at: string }
  if (inst.coach_id !== auth.userId) return jsonError('You are not assigned to this class', 403)
  if (new Date(inst.starts_at) < new Date()) return jsonError('Cannot request sub for past classes', 400)

  try {
    const { data, error } = await supabase
      .from('sub_requests')
      .insert({
        gym_id: auth.gymId,
        instance_id: instanceId,
        requesting_coach_id: auth.userId,
        note: note?.trim() || null,
        status: 'open',
      })
      .select()
      .single()
    if (error) throw error
    return jsonOk(data)
  } catch (err) {
    return jsonServerError('Failed to create sub request', err)
  }
}
