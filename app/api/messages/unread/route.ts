// app/api/messages/unread/route.ts
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

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
// GET /api/messages/unread — get unread count(s)
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await getDualRoleUser()
  if ('error' in auth) return auth.error

  const { supabase, user, userData } = auth

  if (userData.role === 'member') {
    // Return member_unread for their own conversation (0 if none exists)
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('member_unread')
      .eq('gym_id', userData.gym_id)
      .eq('member_id', user.id)
      .maybeSingle()

    if (convError) return jsonServerError('unread GET member lookup', convError)

    return jsonOk({ unread: conversation?.member_unread ?? 0 })

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
