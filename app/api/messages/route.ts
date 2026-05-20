// app/api/messages/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from '@/lib/validation/z'
import { parseBody, jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { NextResponse } from 'next/server'

interface Message {
  id: string
  conversation_id: string
  gym_id: string
  sender_id: string
  body: string
  created_at: string
}

const postMemberSchema = z.object({
  body: z.string({ min: 1, max: 2000 }),
})

const postOwnerSchema = z.object({
  body: z.string({ min: 1, max: 2000 }),
  conversationId: z.uuid(),
})

// ---------------------------------------------------------------------------
// Dual-role auth helper
// ---------------------------------------------------------------------------
async function getDualRoleUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: jsonError('Unauthorized', 401) } as const

  const { data: userData } = await supabase
    .from('users')
    .select('gym_id, role, name, email, revoked_at')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: jsonError('Unauthorized', 401) } as const

  const u = userData as {
    gym_id: string
    role: string
    name: string
    email: string
    revoked_at: string | null
  }

  if (u.revoked_at) return { error: jsonError('Revoked', 403) } as const

  return { supabase, user, userData: u } as const
}

// ---------------------------------------------------------------------------
// GET /api/messages?conversationId=<uuid>
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  const auth = await getDualRoleUser()
  if ('error' in auth) return auth.error

  const { supabase, user, userData } = auth

  const url = new URL(req.url)
  const conversationId = url.searchParams.get('conversationId')

  const idResult = z.uuid().parse(conversationId ?? '', 'conversationId')
  if (!idResult.ok) return jsonError(idResult.error, 400)

  // Verify the caller is allowed to access this conversation.
  // Members: conversation.member_id must equal auth user.
  // Owners: conversation.gym_id must equal their gym.
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, gym_id, member_id')
    .eq('id', idResult.value)
    .maybeSingle()

  if (convError) return jsonServerError('messages GET conversation lookup', convError)
  if (!conversation) return jsonError('Conversation not found', 404)

  if (userData.role === 'member') {
    if (conversation.member_id !== user.id) return jsonError('Forbidden', 403)
  } else if (userData.role === 'owner') {
    if (conversation.gym_id !== userData.gym_id) return jsonError('Forbidden', 403)
  } else {
    return jsonError('Forbidden', 403)
  }

  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, conversation_id, gym_id, sender_id, body, created_at')
    .eq('conversation_id', idResult.value)
    .order('created_at', { ascending: true })
    .limit(100)

  if (msgError) return jsonServerError('messages GET fetch', msgError)

  return jsonOk({ messages: (messages ?? []) as Message[] })
}

// ---------------------------------------------------------------------------
// POST /api/messages
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const auth = await getDualRoleUser()
  if ('error' in auth) return auth.error

  const { supabase, user, userData } = auth

  // Parse body — schema differs by role
  let body: string
  let conversationId: string

  if (userData.role === 'member') {
    const parsed = await parseBody(req, postMemberSchema)
    if (parsed instanceof NextResponse) return parsed
    body = parsed.body

    // 1. Upsert conversation (ON CONFLICT DO NOTHING)
    const { error: upsertError } = await supabase
      .from('conversations')
      .insert({ gym_id: userData.gym_id, member_id: user.id })
      .throwOnError()
      // Supabase insert returns an error code for conflicts; we handle below

    // Ignore unique constraint violations (conversation already exists)
    if (upsertError && upsertError.code !== '23505') {
      return jsonServerError('messages POST member upsert conversation', upsertError)
    }

    // 2. SELECT the conversation to get its id
    const { data: conv, error: convSelectError } = await supabase
      .from('conversations')
      .select('id')
      .eq('gym_id', userData.gym_id)
      .eq('member_id', user.id)
      .single()

    if (convSelectError || !conv) {
      return jsonServerError('messages POST member select conversation', convSelectError)
    }

    conversationId = conv.id

    // 3. Insert message via RLS-active client
    const { data: newMsg, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        gym_id: userData.gym_id,
        sender_id: user.id,
        body,
      })
      .select('id, conversation_id, gym_id, sender_id, body, created_at')
      .single()

    if (insertError || !newMsg) {
      return jsonServerError('messages POST member insert message', insertError)
    }

    // 4. Increment owner's unread count via service-role client (SECURITY DEFINER RPC)
    const { error: rpcError } = await createAdminClient()
      .rpc('increment_owner_unread' as never, { p_conversation_id: conversationId } as never)

    if (rpcError) {
      // Non-fatal: message was saved; log but don't fail the request
      console.error('[messages POST] increment_owner_unread failed', rpcError)
    }

    return jsonOk({ message: newMsg as Message })

  } else if (userData.role === 'owner') {
    const parsed = await parseBody(req, postOwnerSchema)
    if (parsed instanceof NextResponse) return parsed
    body = parsed.body
    conversationId = parsed.conversationId

    // Verify owner's access to this conversation via RLS (gym_id must match)
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id, gym_id')
      .eq('id', conversationId)
      .maybeSingle()

    if (convError) return jsonServerError('messages POST owner conversation lookup', convError)
    if (!conv) return jsonError('Conversation not found', 404)
    if (conv.gym_id !== userData.gym_id) return jsonError('Forbidden', 403)

    // 1. Insert message via RLS-active client
    const { data: newMsg, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        gym_id: userData.gym_id,
        sender_id: user.id,
        body,
      })
      .select('id, conversation_id, gym_id, sender_id, body, created_at')
      .single()

    if (insertError || !newMsg) {
      return jsonServerError('messages POST owner insert message', insertError)
    }

    // 2. Increment member's unread count via service-role client (SECURITY DEFINER RPC)
    const { error: rpcError } = await createAdminClient()
      .rpc('increment_member_unread' as never, { p_conversation_id: conversationId } as never)

    if (rpcError) {
      // Non-fatal: message was saved; log but don't fail the request
      console.error('[messages POST] increment_member_unread failed', rpcError)
    }

    return jsonOk({ message: newMsg as Message })

  } else {
    return jsonError('Forbidden', 403)
  }
}
