// app/api/messages/conversations/[id]/read/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { z } from '@/lib/validation/z'
import { requireMessagingAuth, isNextResponse } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// PATCH /api/messages/conversations/[id]/read — mark conversation as read
// ---------------------------------------------------------------------------
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMessagingAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, user, userData } = auth

  const { id } = await params

  const idResult = z.uuid().parse(id, 'id')
  if (!idResult.ok) return jsonError(idResult.error, 400)

  const convId = idResult.value

  // Verify the caller has access to this conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, gym_id, member_id')
    .eq('id', convId)
    .maybeSingle()

  if (convError) return jsonServerError('conversations read PATCH lookup', convError)
  if (!conversation) return jsonError('Conversation not found', 404)

  const admin = createAdminClient()

  if (userData.role === 'member') {
    // Members can only mark their own conversation as read
    if (conversation.member_id !== user.id) return jsonError('Forbidden', 403)

    const { error: rpcError } = await admin
      .rpc('reset_member_unread' as never, { conv_id: convId } as never)

    if (rpcError) return jsonServerError('conversations read PATCH reset_member_unread', rpcError)

  } else if (userData.role === 'owner') {
    // Owners can mark any conversation in their gym as read
    if (conversation.gym_id !== userData.gym_id) return jsonError('Forbidden', 403)

    const { error: rpcError } = await admin
      .rpc('reset_owner_unread' as never, { conv_id: convId } as never)

    if (rpcError) return jsonServerError('conversations read PATCH reset_owner_unread', rpcError)

  } else {
    return jsonError('Forbidden', 403)
  }

  return jsonOk({ ok: true })
}
