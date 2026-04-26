import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  let body: { attended?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body')
  }
  const { attended } = body

  if (attended !== true && attended !== false && attended !== null) {
    return jsonError('attended must be true, false, or null')
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, gym_id, status')
    .eq('id', params.id)
    .single()

  if (!booking) {
    return jsonError('Booking not found', 404)
  }

  if (booking.gym_id !== userData.gym_id) {
    return jsonError('Forbidden', 403)
  }

  if (booking.status !== 'confirmed') {
    return jsonError('Can only mark attendance on confirmed bookings')
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update({ attended })
    .eq('id', params.id)

  if (updateError) {
    return jsonServerError('bookings/[id]/attend PATCH', updateError)
  }

  return jsonOk({ success: true })
}
