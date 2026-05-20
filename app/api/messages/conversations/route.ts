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

  const convList = conversations ?? []

  if (convList.length === 0) {
    return jsonOk({ conversations: [] })
  }

  const convIds = convList.map(c => c.id)

  // Fetch recent messages for all conversations in one query.
  // We over-fetch and deduplicate in JS since Supabase doesn't support DISTINCT ON.
  const { data: recentMessages } = await admin
    .from('messages')
    .select('conversation_id, body, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })
    .limit(convIds.length * 5) // fetch up to 5 per conversation to ensure we get at least 1 each

  // Build a map of conversation_id -> last message body
  const lastMessageMap = new Map<string, string>()
  for (const msg of recentMessages ?? []) {
    if (!lastMessageMap.has(msg.conversation_id)) {
      lastMessageMap.set(msg.conversation_id, msg.body)
    }
  }

  // Build response
  const result = convList.map(conv => {
    const rawUser = (conv as Record<string, unknown>).users as { name: string; email: string } | null
    const preview = lastMessageMap.get(conv.id) ?? null
    return {
      id: conv.id,
      gym_id: conv.gym_id,
      member_id: conv.member_id,
      created_at: conv.created_at,
      last_message_at: conv.last_message_at,
      owner_unread: conv.owner_unread,
      member_unread: conv.member_unread,
      member_name: rawUser?.name ?? '',
      member_email: rawUser?.email ?? '',
      last_message_preview: preview ? (preview.length > 80 ? preview.slice(0, 80) + '…' : preview) : null,
    }
  })

  return jsonOk({ conversations: result })
}
