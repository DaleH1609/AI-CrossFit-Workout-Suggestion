export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireCoach() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  const d = data as { gym_id: string; role: string } | null
  if (!d || !['coach', 'admin', 'owner'].includes(d.role ?? '')) return null
  return { userId: user.id, gymId: d.gym_id }
}

// PATCH — claim or cancel a sub request
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_RE.test(id)) return jsonError('Invalid id', 400)

  const auth = await requireCoach()
  if (!auth) return jsonError('Unauthorized', 401)

  const body = await req.json().catch(() => ({}))
  const { action } = body as { action?: 'claim' | 'cancel' }
  if (!action) return jsonError('action is required (claim | cancel)')

  const supabase = createAdminClient()

  const { data: req_ } = await supabase
    .from('sub_requests')
    .select('id, status, requesting_coach_id, gym_id')
    .eq('id', id)
    .single()

  if (!req_) return jsonError('Sub request not found', 404)
  const r = req_ as { id: string; status: string; requesting_coach_id: string; gym_id: string }
  if (r.gym_id !== auth.gymId) return jsonError('Forbidden', 403)

  try {
    if (action === 'claim') {
      if (r.status !== 'open') return jsonError('Only open requests can be claimed')
      if (r.requesting_coach_id === auth.userId) return jsonError('Cannot claim your own sub request')

      const { error } = await supabase
        .from('sub_requests')
        .update({ status: 'claimed', claimed_by_coach_id: auth.userId })
        .eq('id', id)
      if (error) throw error

      // Re-assign the class instance to the claiming coach
      const { data: sr } = await supabase.from('sub_requests').select('instance_id').eq('id', id).single()
      if (sr) {
        await supabase
          .from('class_instances')
          .update({ coach_id: auth.userId })
          .eq('id', (sr as { instance_id: string }).instance_id)
      }
    } else if (action === 'cancel') {
      if (r.requesting_coach_id !== auth.userId) return jsonError('Only the requesting coach can cancel')
      if (r.status === 'claimed') return jsonError('Cannot cancel an already-claimed request')

      const { error } = await supabase
        .from('sub_requests')
        .update({ status: 'cancelled' })
        .eq('id', id)
      if (error) throw error
    } else {
      return jsonError('Invalid action')
    }

    return jsonOk({ ok: true })
  } catch (err) {
    return jsonServerError('Failed to update sub request', err)
  }
}
