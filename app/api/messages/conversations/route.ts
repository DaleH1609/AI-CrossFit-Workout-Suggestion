// app/api/messages/conversations/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

interface ConversationWithMember {
  id: string
  gym_id: string
  member_id: string
  created_at: string
  last_message_at: string
  owner_unread: number
  member_unread: number
  member_name: string
  member_email: string
  last_message_preview: string | null
}

// ---------------------------------------------------------------------------
// GET /api/messages/conversations — list all conversations (owner only)
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { userData } = auth

  const admin = createAdminClient()

  const { data: conversations, error: convError } = await admin
    .from('conversations')
    .select('*, users!conversations_member_id_fkey(name, email)')
    .eq('gym_id', userData.gym_id)
    .order('last_message_at', { ascending: false })

  if (convError) return jsonServerError('conversations GET fetch', convError)

  // Build response with last message preview for each conversation
  const results: ConversationWithMember[] = await Promise.all(
    (conversations ?? []).map(async (conv) => {
      const userJoin = conv.users as { name: string; email: string } | null

      const { data: lastMsg } = await admin
        .from('messages')
        .select('body')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const preview = lastMsg?.body
        ? lastMsg.body.slice(0, 80) + (lastMsg.body.length > 80 ? '…' : '')
        : null

      return {
        id: conv.id,
        gym_id: conv.gym_id,
        member_id: conv.member_id,
        created_at: conv.created_at,
        last_message_at: conv.last_message_at,
        owner_unread: conv.owner_unread,
        member_unread: conv.member_unread,
        member_name: userJoin?.name ?? '',
        member_email: userJoin?.email ?? '',
        last_message_preview: preview,
      }
    })
  )

  return jsonOk({ conversations: results })
}
