export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!UUID_RE.test(params.id)) return jsonError('Invalid booking id', 400)

  // Allow owner, admin, or coach (coaches can only mark attendance for their assigned classes)
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabaseUser.from('users').select('gym_id, role').eq('id', user.id).single()
  const u = userData as { gym_id: string; role: string } | null
  if (!u || !['owner', 'admin', 'coach'].includes(u.role ?? '')) return jsonError('Forbidden', 403)

  let body: { attended?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON body') }
  const { attended } = body
  if (attended !== true && attended !== false && attended !== null) {
    return jsonError('attended must be true, false, or null')
  }

  const supabase = createAdminClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, gym_id, status, instance_id')
    .eq('id', params.id)
    .single()

  if (!booking) return jsonError('Booking not found', 404)
  if ((booking as { gym_id: string }).gym_id !== u.gym_id) return jsonError('Forbidden', 403)

  // Coaches may only mark attendance for their assigned class instances
  if (u.role === 'coach') {
    const { data: instance } = await supabase
      .from('class_instances')
      .select('coach_id')
      .eq('id', (booking as { instance_id: string }).instance_id)
      .single()
    if (!instance || (instance as { coach_id: string | null }).coach_id !== user.id) {
      return jsonError('Coaches can only mark attendance for their assigned classes', 403)
    }
  }

  if ((booking as { status: string }).status !== 'confirmed') {
    return jsonError('Can only mark attendance on confirmed bookings')
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update({ attended })
    .eq('id', params.id)

  if (updateError) return jsonServerError('bookings/[id]/attend PATCH', updateError)

  return jsonOk({ success: true })
}
