export const dynamic = 'force-dynamic'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { UUID_RE } from '@/lib/validation/z'

// PATCH /api/schedule/instances/[id] — update coach assignment
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_RE.test(id)) return jsonError('Invalid instance id', 400)

  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const body = await req.json().catch(() => ({}))
  const { coachId } = body as { coachId?: string | null }

  // coachId null = unassign; string = must be valid UUID and a coach in this gym
  if (coachId !== null && coachId !== undefined) {
    if (!UUID_RE.test(coachId)) return jsonError('Invalid coachId', 400)
    const { data: coach } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', coachId)
      .eq('gym_id', userData.gym_id)
      .single()
    if (!coach || !['coach', 'admin', 'owner'].includes((coach as { role: string }).role)) {
      return jsonError('User is not a coach in this gym', 400)
    }
  }

  try {
    const { error } = await supabase
      .from('class_instances')
      .update({ coach_id: coachId ?? null })
      .eq('id', id)
      .eq('gym_id', userData.gym_id)
    if (error) throw error
    return jsonOk({ ok: true })
  } catch (err) {
    return jsonServerError('Failed to update coach assignment', err)
  }
}
