// app/api/messages/unread/route.ts
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { requireMessagingAuth, isNextResponse } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// GET /api/messages/unread — get unread count(s)
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await requireMessagingAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, user, userData } = auth

  if (userData.role === 'member') {
    // Return member_unread for their own conversation (0 if none exists)
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, member_unread')
      .eq('gym_id', userData.gym_id)
      .eq('member_id', user.id)
      .maybeSingle()

    if (convError) return jsonServerError('unread GET member lookup', convError)

    return jsonOk({
      unread: conversation?.member_unread ?? 0,
      conversation_id: conversation?.id ?? null,
    })

  } else if (userData.role === 'owner') {
    // Return sum of owner_unread across all conversations in their gym
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('owner_unread')
      .eq('gym_id', userData.gym_id)

    if (convError) return jsonServerError('unread GET owner lookup', convError)

    const total = (conversations ?? []).reduce(
      (sum, conv) => sum + (conv.owner_unread ?? 0),
      0
    )

    return jsonOk({ unread: total })

  } else {
    return jsonError('Forbidden', 403)
  }
}
