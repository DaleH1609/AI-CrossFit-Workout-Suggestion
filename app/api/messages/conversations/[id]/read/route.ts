// app/api/messages/conversations/[id]/read/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { z } from '@/lib/validation/z'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Dual-role auth helper (mirrors the pattern in app/api/messages/route.ts)
// ---------------------------------------------------------------------------
async function getDualRoleUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: jsonError('Unauthorized', 401) } as const

  const { data: userData } = await supabase
    .from('users')
    .select('gym_id, role, revoked_at')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: jsonError('Unauthorized', 401) } as const

  const u = userData as {
    gym_id: string
    role: string
    revoked_at: string | null
  }

  if (u.revoked_at) return { error: jsonError('Revoked', 403) } as const

  return { supabase, user, userData: u } as const
}

// ---------------------------------------------------------------------------
// PATCH /api/messages/conversations/[id]/read — mark conversation as read
// ---------------------------------------------------------------------------
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getDualRoleUser()
  if ('error' in auth) return auth.error

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
