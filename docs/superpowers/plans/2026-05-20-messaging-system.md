# Messaging System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-way in-app messaging system so gym members can contact their gym owner and receive replies in real time.

**Architecture:** Two new Supabase tables (`conversations` + `messages`) with RLS. Four API route handlers cover send, fetch, list-conversations, and mark-as-read. Client-side Realtime subscriptions (via `@/lib/supabase/client`) deliver new messages without polling. Unread counters are mutated via SECURITY DEFINER RPCs that bypass RLS — called through the existing `createAdminClient()` service-role client.

**Tech Stack:** Next.js App Router, Supabase (tables + RLS + Realtime), `@/lib/supabase/admin.ts` (`createAdminClient`), `@/lib/api/response.ts` helpers (`jsonOk`, `jsonError`, `jsonServerError`), `@/lib/validation/z.ts` custom Zod wrapper

**Spec:** `docs/superpowers/specs/2026-05-20-messaging-system-design.md`

---

## File Map

Files to **create**:
- `supabase/migrations/064_messaging.sql` — tables, RLS, indexes, unread RPCs (all in one migration)
- `app/api/messages/route.ts` — GET (fetch messages) + POST (send message)
- `app/api/messages/conversations/route.ts` — GET (owner: list conversations with last message preview)
- `app/api/messages/conversations/[id]/read/route.ts` — PATCH (mark as read)
- `app/api/messages/unread/route.ts` — GET (unread count for nav badges)
- `components/messages/message-bubble.tsx` — single message bubble, aligned by sender
- `components/messages/message-input.tsx` — textarea + send button, 2000-char limit
- `components/messages/message-thread.tsx` — scrollable message list + Realtime subscription
- `components/messages/conversation-list.tsx` — owner-only left panel listing conversations
- `app/(owner)/messages/page.tsx` — owner inbox page (ConversationList + MessageThread)
- `app/(owner)/messages/loading.tsx`
- `app/(owner)/messages/error.tsx`
- `app/(member)/messages/page.tsx` — member thread page
- `app/(member)/messages/loading.tsx`
- `app/(member)/messages/error.tsx`

Files to **modify**:
- `components/layout/owner-sidebar.tsx` — add Messages nav item with unread badge
- `components/layout/member-nav.tsx` — add Messages nav item with unread dot
- `app/(member)/profile/page.tsx` — add "Message your gym" link

---

## Task 1: Database Migration (Tables + RPCs in one file)

**Files:**
- Create: `supabase/migrations/064_messaging.sql`

Both tables and the four atomic unread RPCs go in a single migration so API code can reference the RPCs without ordering issues.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/064_messaging.sql

-- Tables

CREATE TABLE conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  owner_unread    int NOT NULL DEFAULT 0,
  member_unread   int NOT NULL DEFAULT 0,
  UNIQUE (gym_id, member_id)
);

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  gym_id          uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id),
  body            text NOT NULL CHECK (char_length(body) <= 2000),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes

CREATE INDEX messages_conversation_id_idx ON messages (conversation_id);
CREATE INDEX messages_gym_id_idx          ON messages (gym_id);
CREATE INDEX conversations_gym_id_idx     ON conversations (gym_id);
CREATE INDEX conversations_member_id_idx  ON conversations (member_id);

-- RLS

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_insert_own_conversation" ON conversations
  FOR INSERT WITH CHECK (
    member_id = auth.uid() AND
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "member_select_own_conversation" ON conversations
  FOR SELECT USING (member_id = auth.uid());

CREATE POLICY "owner_select_gym_conversations" ON conversations
  FOR SELECT USING (
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "member_insert_own_message" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations WHERE member_id = auth.uid()
    )
  );

CREATE POLICY "member_select_own_messages" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE member_id = auth.uid()
    )
  );

CREATE POLICY "owner_select_gym_messages" ON messages
  FOR SELECT USING (
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "owner_insert_gym_message" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

-- No UPDATE or DELETE on messages (immutable).
-- No UPDATE granted on conversations to users -- unread mutations use SECURITY DEFINER RPCs.

-- Atomic unread counter RPCs (SECURITY DEFINER so they can UPDATE conversations
-- without requiring UPDATE grants for users. SET search_path prevents injection.)

CREATE OR REPLACE FUNCTION increment_owner_unread(conv_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE conversations SET owner_unread = owner_unread + 1, last_message_at = now()
  WHERE id = conv_id;
$$;

CREATE OR REPLACE FUNCTION increment_member_unread(conv_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE conversations SET member_unread = member_unread + 1, last_message_at = now()
  WHERE id = conv_id;
$$;

CREATE OR REPLACE FUNCTION reset_owner_unread(conv_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE conversations SET owner_unread = 0 WHERE id = conv_id;
$$;

CREATE OR REPLACE FUNCTION reset_member_unread(conv_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE conversations SET member_unread = 0 WHERE id = conv_id;
$$;
```

- [ ] **Step 2: Apply the migration**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app
npx supabase db push
```

Expected: applies without errors. If you see a conflict, check that no `conversations` or `messages` tables exist already.

- [ ] **Step 3: Verify in Supabase dashboard**

Table Editor: confirm `conversations` and `messages` tables exist with correct columns.
Database > Functions: confirm the four RPC functions appear.

- [ ] **Step 4: Enable Realtime on the messages table**

Supabase Dashboard > Database > Replication > toggle `messages` table ON for `INSERT` events.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/064_messaging.sql
git commit -m "feat: add conversations and messages tables, RLS, and unread counter RPCs"
```

---

## Task 2: API — Send & Fetch Messages

**Files:**
- Create: `app/api/messages/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// app/api/messages/route.ts
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { z } from '@/lib/validation/z'

// Auth helper for dual-role routes (member or owner)
async function resolveUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('gym_id, role, revoked_at')
    .eq('id', user.id)
    .single()

  if (!userData || userData.revoked_at) return null
  return { supabase, user, userData: userData as { gym_id: string; role: string } }
}

// GET /api/messages?conversationId=
// Returns last 100 messages for a conversation, ascending. No side effects.
export async function GET(req: Request) {
  const auth = await resolveUser()
  if (!auth) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')
  if (!conversationId) return jsonError('conversationId is required')

  const { supabase, user, userData } = auth

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, gym_id, member_id')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation) return jsonError('Conversation not found', 404)

  if (userData.role === 'member' && conversation.member_id !== user.id) {
    return jsonError('Forbidden', 403)
  }
  if (userData.role === 'owner' && conversation.gym_id !== userData.gym_id) {
    return jsonError('Forbidden', 403)
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return jsonServerError('GET /api/messages', error)

  return jsonOk({ messages: messages ?? [] })
}

// POST /api/messages
// Member body: { body }. Owner body: { body, conversationId }.
export async function POST(req: Request) {
  const auth = await resolveUser()
  if (!auth) return jsonError('Unauthorized', 401)

  const { supabase, user, userData } = auth

  let rawBody: unknown
  try { rawBody = await req.json() } catch { return jsonError('Invalid JSON') }

  const bodySchema = z.object({
    body: z.string({ min: 1, max: 2000, trim: true }),
    conversationId: z.uuid().optional(),
  })
  const parsed = bodySchema.parse(rawBody)
  if (!parsed.ok) return jsonError(parsed.error)
  const { body, conversationId } = parsed.value

  const admin = createAdminClient()

  if (userData.role === 'member') {
    // Upsert conversation (creates on first message, no-ops if already exists)
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .upsert(
        { gym_id: userData.gym_id, member_id: user.id },
        { onConflict: 'gym_id,member_id', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (convErr || !conv) return jsonServerError('POST /api/messages upsert conv', convErr)

    const { data: message, error: msgErr } = await supabase
      .from('messages')
      .insert({ conversation_id: conv.id, gym_id: userData.gym_id, sender_id: user.id, body })
      .select('id, conversation_id, sender_id, body, created_at')
      .single()

    if (msgErr) return jsonServerError('POST /api/messages member insert', msgErr)

    // Increment owner_unread atomically via SECURITY DEFINER RPC (bypasses RLS UPDATE restriction)
    await admin.rpc('increment_owner_unread', { conv_id: conv.id })

    return jsonOk({ message })
  }

  if (userData.role === 'owner') {
    if (!conversationId) return jsonError('conversationId required for owner')

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id, gym_id, member_id')
      .eq('id', conversationId)
      .single()

    if (convErr || !conv) return jsonError('Conversation not found', 404)
    if (conv.gym_id !== userData.gym_id) return jsonError('Forbidden', 403)

    const { data: message, error: msgErr } = await supabase
      .from('messages')
      .insert({ conversation_id: conv.id, gym_id: conv.gym_id, sender_id: user.id, body })
      .select('id, conversation_id, sender_id, body, created_at')
      .single()

    if (msgErr) return jsonServerError('POST /api/messages owner insert', msgErr)

    await admin.rpc('increment_member_unread', { conv_id: conv.id })

    return jsonOk({ message })
  }

  return jsonError('Forbidden', 403)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/messages/route.ts
git commit -m "feat: add GET and POST /api/messages route handlers"
```

---

## Task 3: API — Conversations List, Mark as Read, and Unread Count

**Files:**
- Create: `app/api/messages/conversations/route.ts`
- Create: `app/api/messages/conversations/[id]/read/route.ts`
- Create: `app/api/messages/unread/route.ts`

- [ ] **Step 1: Create conversations list route (owner only)**

```typescript
// app/api/messages/conversations/route.ts
export const dynamic = 'force-dynamic'

import { jsonOk, jsonServerError } from '@/lib/api/response'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

export async function GET() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth

  // Fetch conversations with member info and the body of the latest message for preview
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      id,
      member_id,
      last_message_at,
      owner_unread,
      member_unread,
      users!conversations_member_id_fkey (name, email),
      messages (body, created_at)
    `)
    .eq('gym_id', userData.gym_id)
    .order('last_message_at', { ascending: false })

  if (error) return jsonServerError('GET /api/messages/conversations', error)

  // Attach last message preview to each conversation
  const result = (conversations ?? []).map(conv => {
    const msgs = (conv.messages ?? []) as { body: string; created_at: string }[]
    const lastMessage = msgs.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
    return {
      id: conv.id,
      member_id: conv.member_id,
      last_message_at: conv.last_message_at,
      owner_unread: conv.owner_unread,
      member_unread: conv.member_unread,
      member: conv.users,
      lastMessagePreview: lastMessage ? lastMessage.body.slice(0, 60) : null,
    }
  })

  return jsonOk({ conversations: result })
}
```

> **Note on the join:** Supabase PostgREST allows `!fkey` syntax to disambiguate foreign keys when there are multiple FK relationships. The `users!conversations_member_id_fkey` join fetches the member's name and email. The `messages` join fetches all messages for the conversation — we then sort and pick the most recent one for the preview. If performance becomes a concern, replace with a custom RPC that does this in SQL.

- [ ] **Step 2: Create mark-as-read route**

```typescript
// app/api/messages/conversations/[id]/read/route.ts
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

async function resolveUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: userData } = await supabase
    .from('users')
    .select('gym_id, role, revoked_at')
    .eq('id', user.id)
    .single()
  if (!userData || userData.revoked_at) return null
  return { supabase, user, userData: userData as { gym_id: string; role: string } }
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveUser()
  if (!auth) return jsonError('Unauthorized', 401)

  const { supabase, user, userData } = auth
  const { id: conversationId } = await params

  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select('id, gym_id, member_id')
    .eq('id', conversationId)
    .single()

  if (convErr || !conv) return jsonError('Conversation not found', 404)

  if (userData.role === 'member' && conv.member_id !== user.id) return jsonError('Forbidden', 403)
  if (userData.role === 'owner' && conv.gym_id !== userData.gym_id) return jsonError('Forbidden', 403)

  // Use admin client to call SECURITY DEFINER RPC (consistent with spec requirement
  // that all unread mutations use the service-role client)
  const admin = createAdminClient()
  const rpcName = userData.role === 'owner' ? 'reset_owner_unread' : 'reset_member_unread'
  const { error } = await admin.rpc(rpcName, { conv_id: conversationId })

  if (error) return jsonServerError(`PATCH /api/messages/conversations/${conversationId}/read`, error)

  return jsonOk({ ok: true })
}
```

- [ ] **Step 3: Create unread count route (for nav badges)**

```typescript
// app/api/messages/unread/route.ts
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonServerError } from '@/lib/api/response'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonOk({ unread: 0 })

  const { data: userData } = await supabase
    .from('users')
    .select('gym_id, role, revoked_at')
    .eq('id', user.id)
    .single()

  if (!userData || userData.revoked_at) return jsonOk({ unread: 0 })

  if (userData.role === 'owner') {
    const { data, error } = await supabase
      .from('conversations')
      .select('owner_unread')
      .eq('gym_id', userData.gym_id)

    if (error) return jsonServerError('GET /api/messages/unread owner', error)
    const total = (data ?? []).reduce((sum, c) => sum + (c.owner_unread ?? 0), 0)
    return jsonOk({ unread: total })
  }

  if (userData.role === 'member') {
    const { data, error } = await supabase
      .from('conversations')
      .select('member_unread')
      .eq('member_id', user.id)
      .single()

    // PGRST116 = no rows (member has no conversation yet) — return 0
    if (error && error.code !== 'PGRST116') {
      return jsonServerError('GET /api/messages/unread member', error)
    }
    return jsonOk({ unread: (data as { member_unread: number } | null)?.member_unread ?? 0 })
  }

  return jsonOk({ unread: 0 })
}
```

- [ ] **Step 4: Smoke test (dev server)**

Start the dev server: `npm run dev`

As **owner**: `GET /api/messages/conversations` → `{ conversations: [] }`, `GET /api/messages/unread` → `{ unread: 0 }`
As **member**: `GET /api/messages/unread` → `{ unread: 0 }`
Unauthenticated: `GET /api/messages/conversations` → 403

- [ ] **Step 5: Commit**

```bash
git add app/api/messages/conversations/route.ts \
        "app/api/messages/conversations/[id]/read/route.ts" \
        app/api/messages/unread/route.ts
git commit -m "feat: add conversations list, mark-as-read, and unread count API routes"
```

---

## Task 4: Shared Message Components

**Files:**
- Create: `components/messages/message-bubble.tsx`
- Create: `components/messages/message-input.tsx`
- Create: `components/messages/message-thread.tsx`

- [ ] **Step 1: Create MessageBubble**

```typescript
// components/messages/message-bubble.tsx
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  body: string
  createdAt: string
  isSelf: boolean
}

export function MessageBubble({ body, createdAt, isSelf }: MessageBubbleProps) {
  const time = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date = new Date(createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })

  return (
    <div className={cn('flex flex-col gap-0.5', isSelf ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-xs md:max-w-md lg:max-w-lg px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
          isSelf
            ? 'bg-accent text-white rounded-br-sm'
            : 'bg-surface-raised text-foreground rounded-bl-sm border border-border'
        )}
      >
        {body}
      </div>
      <span className="text-[10px] text-secondary px-1">
        {date} · {time}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Create MessageInput**

```typescript
// components/messages/message-input.tsx
'use client'
import { useState, useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSend: (body: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

const MAX_CHARS = 2000

export function MessageInput({ onSend, disabled, placeholder = 'Type a message...' }: MessageInputProps) {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || sending || disabled) return
    setSending(true)
    try {
      await onSend(trimmed)
      setValue('')
      textareaRef.current?.focus()
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const charsLeft = MAX_CHARS - value.length
  const isOverLimit = charsLeft < 0

  return (
    <div className="border-t border-border bg-surface p-4">
      <div className="flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder={placeholder}
          disabled={disabled || sending}
          className={cn(
            'w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm',
            'placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-accent',
            'disabled:opacity-50 transition-colors',
            isOverLimit ? 'border-danger' : 'border-border'
          )}
        />
        <div className="flex items-center justify-between">
          <span className={cn('text-xs', charsLeft < 100 ? 'text-warning' : 'text-secondary')}>
            {charsLeft} chars left · Cmd+Enter to send
          </span>
          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim() || sending || disabled || isOverLimit}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create MessageThread**

Note the `Message` interface includes `conversation_id` — this is needed in the Realtime handler to filter messages for this specific conversation when the owner subscribes by `gym_id` (which is broader than a single conversation).

```typescript
// components/messages/message-thread.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'

// conversation_id must be in this interface — used in the Realtime handler
// to filter out messages from other conversations when owner subscribes by gym_id
interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}

interface MessageThreadProps {
  conversationId: string
  currentUserId: string
  gymId: string
  role: 'owner' | 'member'
  initialMessages?: Message[]
}

export function MessageThread({
  conversationId,
  currentUserId,
  gymId,
  role,
  initialMessages = [],
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [loading, setLoading] = useState(initialMessages.length === 0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (initialMessages.length > 0) return
    fetch(`/api/messages?conversationId=${conversationId}`)
      .then(r => r.json())
      .then(data => { setMessages(data.messages ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [conversationId, initialMessages.length])

  // Mark as read when thread opens
  useEffect(() => {
    fetch(`/api/messages/conversations/${conversationId}/read`, { method: 'PATCH' })
  }, [conversationId])

  // Realtime: owner subscribes by gym_id (receives all gym messages),
  // member subscribes by conversation_id (their thread only)
  useEffect(() => {
    const filter = role === 'owner'
      ? `gym_id=eq.${gymId}`
      : `conversation_id=eq.${conversationId}`

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter },
        (payload) => {
          const newMsg = payload.new as Message
          // Filter to this conversation (owner filter is gym-wide)
          if (newMsg.conversation_id !== conversationId) return
          setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, gymId, role, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(body: string) {
    const payload: Record<string, string> = { body }
    if (role === 'owner') payload.conversationId = conversationId

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to send message')
    const { message } = await res.json()
    setMessages(prev => prev.find(m => m.id === message.id) ? prev : [...prev, message])
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-secondary text-sm">Loading messages...</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-secondary text-sm">No messages yet. Send one below.</p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            body={msg.body}
            createdAt={msg.created_at}
            isSelf={msg.sender_id === currentUserId}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/messages/
git commit -m "feat: add MessageBubble, MessageInput, and MessageThread components"
```

---

## Task 5: ConversationList Component

**Files:**
- Create: `components/messages/conversation-list.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/messages/conversation-list.tsx
'use client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Conversation {
  id: string
  member_id: string
  last_message_at: string
  owner_unread: number
  member: { name: string; email: string } | null
  lastMessagePreview: string | null
}

interface ConversationListProps {
  selectedId: string | null
  onSelect: (id: string) => void
  gymId: string
}

export function ConversationList({ selectedId, onSelect, gymId }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function load() {
    const res = await fetch('/api/messages/conversations')
    const data = await res.json()
    setConversations(data.conversations ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Refresh list when a new message arrives in the gym
  useEffect(() => {
    const channel = supabase
      .channel(`conv-list:${gymId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `gym_id=eq.${gymId}` },
        () => load()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [gymId, supabase])

  if (loading) {
    return <div className="flex items-center justify-center h-32 text-secondary text-sm">Loading...</div>
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-secondary text-sm text-center">
        No messages yet. Members will appear here when they write to you.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {conversations.map(conv => {
        const name = conv.member?.name ?? conv.member?.email ?? 'Member'
        const timeAgo = new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
        const isSelected = conv.id === selectedId
        const hasUnread = conv.owner_unread > 0

        return (
          <li key={conv.id}>
            <button
              type="button"
              onClick={() => onSelect(conv.id)}
              className={cn(
                'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
                isSelected ? 'bg-accent-5' : 'hover:bg-surface-raised'
              )}
            >
              <div className="shrink-0 w-9 h-9 rounded-full bg-surface-raised border border-border flex items-center justify-center text-sm font-medium text-secondary uppercase">
                {name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('text-sm truncate', hasUnread ? 'font-semibold text-foreground' : 'text-foreground')}>
                    {name}
                  </span>
                  <span className="text-xs text-secondary shrink-0">{timeAgo}</span>
                </div>
                {conv.lastMessagePreview && (
                  <p className="text-xs text-secondary truncate mt-0.5">{conv.lastMessagePreview}</p>
                )}
              </div>
              {hasUnread && (
                <span className="shrink-0 w-2 h-2 rounded-full bg-accent" />
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/messages/conversation-list.tsx
git commit -m "feat: add ConversationList component with last-message preview and Realtime refresh"
```

---

## Task 6: Owner Messages Page

**Files:**
- Create: `app/(owner)/messages/page.tsx`
- Create: `app/(owner)/messages/loading.tsx`
- Create: `app/(owner)/messages/error.tsx`

- [ ] **Step 1: Create the owner page**

```typescript
// app/(owner)/messages/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ConversationList } from '@/components/messages/conversation-list'
import { MessageThread } from '@/components/messages/message-thread'

interface OwnerInfo {
  userId: string
  gymId: string
}

export default function OwnerMessagesPage() {
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo | null>(null)
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('users')
        .select('gym_id')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setOwnerInfo({ userId: user.id, gymId: (data as { gym_id: string }).gym_id })
        })
    })
  }, [])

  if (!ownerInfo) {
    return <div className="text-secondary text-sm p-8">Loading...</div>
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      <h1 className="text-2xl font-semibold mb-6">Messages</h1>
      <div className="flex-1 flex border border-border rounded-xl overflow-hidden min-h-0">
        <aside className="w-72 shrink-0 border-r border-border overflow-y-auto bg-surface">
          <ConversationList
            selectedId={selectedConvId}
            onSelect={id => setSelectedConvId(id)}
            gymId={ownerInfo.gymId}
          />
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConvId ? (
            <MessageThread
              key={selectedConvId}
              conversationId={selectedConvId}
              currentUserId={ownerInfo.userId}
              gymId={ownerInfo.gymId}
              role="owner"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-secondary text-sm">
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create loading.tsx**

```typescript
// app/(owner)/messages/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-40 bg-surface-raised rounded" />
      <div className="h-[500px] bg-surface-raised rounded-xl" />
    </div>
  )
}
```

- [ ] **Step 3: Create error.tsx**

```typescript
// app/(owner)/messages/error.tsx
'use client'
import { RouteError } from '@/components/ui/route-error'

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} />
}
```

- [ ] **Step 4: Commit**

```bash
git add "app/(owner)/messages/"
git commit -m "feat: add owner messages inbox page"
```

---

## Task 7: Member Messages Page

**Files:**
- Create: `app/(member)/messages/page.tsx`
- Create: `app/(member)/messages/loading.tsx`
- Create: `app/(member)/messages/error.tsx`

- [ ] **Step 1: Create the member page**

```typescript
// app/(member)/messages/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageThread } from '@/components/messages/message-thread'

interface MemberInfo {
  userId: string
  gymId: string
  conversationId: string | null
}

export default function MemberMessagesPage() {
  const [info, setInfo] = useState<MemberInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('users')
        .select('gym_id')
        .eq('id', user.id)
        .single()
        .then(async ({ data: userData }) => {
          if (!userData) return
          const gymId = (userData as { gym_id: string }).gym_id
          const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('member_id', user.id)
            .single()
          setInfo({ userId: user.id, gymId, conversationId: (conv as { id: string } | null)?.id ?? null })
          setLoading(false)
        })
    })
  }, [])

  if (loading) return <div className="text-secondary text-sm">Loading...</div>
  if (!info) return null

  if (!info.conversationId) {
    return (
      <FirstMessageView
        userId={info.userId}
        onCreated={id => setInfo({ ...info, conversationId: id })}
      />
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <h1 className="text-2xl font-semibold mb-6">Message your gym</h1>
      <div className="flex-1 border border-border rounded-xl overflow-hidden min-h-0">
        <MessageThread
          conversationId={info.conversationId}
          currentUserId={info.userId}
          gymId={info.gymId}
          role="member"
        />
      </div>
    </div>
  )
}

function FirstMessageView({
  userId,
  onCreated,
}: {
  userId: string
  onCreated: (conversationId: string) => void
}) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim() }),
      })
      if (!res.ok) throw new Error('Failed to send')

      // Re-fetch the conversation that was just created by the POST handler
      const supabase = createClient()
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('member_id', userId)
        .single()

      if (conv) onCreated((conv as { id: string }).id)
    } catch {
      setError('Something went wrong. Please try again.')
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <h1 className="text-2xl font-semibold mb-6">Message your gym</h1>
      <div className="border border-border rounded-xl p-6 flex flex-col gap-4">
        <p className="text-secondary text-sm">
          Send a message to your gym owner. They&apos;ll reply here.
        </p>
        <textarea
          rows={4}
          value={body}
          onChange={e => setBody(e.target.value.slice(0, 2000))}
          placeholder="What would you like to say?"
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        <button
          type="button"
          onClick={handleSend}
          disabled={!body.trim() || sending}
          className="self-end px-4 py-1.5 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-40"
        >
          {sending ? 'Sending...' : 'Send message'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create loading.tsx**

```typescript
// app/(member)/messages/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 bg-surface-raised rounded" />
      <div className="h-[400px] bg-surface-raised rounded-xl" />
    </div>
  )
}
```

- [ ] **Step 3: Create error.tsx**

```typescript
// app/(member)/messages/error.tsx
'use client'
import { RouteError } from '@/components/ui/route-error'

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} />
}
```

- [ ] **Step 4: Commit**

```bash
git add "app/(member)/messages/"
git commit -m "feat: add member messages page"
```

---

## Task 8: Navigation — Add Messages Links

**Files:**
- Modify: `components/layout/owner-sidebar.tsx`
- Modify: `components/layout/member-nav.tsx`
- Modify: `app/(member)/profile/page.tsx`

### Owner Sidebar

- [ ] **Step 1: Add icon and hook to owner-sidebar.tsx**

At the top of the file, add `useEffect` to the react import:
```typescript
import { useState, useRef, useEffect } from 'react'
```

Add this icon function after the existing icon functions (e.g., after `IconFunnel`):
```typescript
function IconMessage() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
```

Add the Messages entry to the `nav` array (after `wod-blog`, before `settings`):
```typescript
{ href: '/messages', label: 'Messages', Icon: IconMessage },
```

Inside the `OwnerSidebar` function body, add the unread hook right after the existing state declarations:
```typescript
const [ownerUnread, setOwnerUnread] = useState(0)
useEffect(() => {
  fetch('/api/messages/unread').then(r => r.json()).then(d => setOwnerUnread(d.unread ?? 0))
}, [])
```

- [ ] **Step 2: Add unread dot to desktop nav icons**

In the desktop sidebar nav map, find the icon `<span>` line:
```typescript
<span className="shrink-0"><Icon /></span>
```
Replace it with:
```typescript
<span className="shrink-0 relative">
  <Icon />
  {href === '/messages' && ownerUnread > 0 && (
    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" />
  )}
</span>
```

Do the same in the **mobile** sidebar nav map.

- [ ] **Step 3: Add unread dot to member-nav.tsx**

Add `useEffect` to the React import at the top.

Add "Messages" to the `nav` array (after "Challenges", before "Profile"):
```typescript
{
  href: '/messages',
  label: 'Messages',
  icon: (
    <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
},
```

Inside `MemberNav`, add the unread state before `signOut`:
```typescript
const [memberUnread, setMemberUnread] = useState(0)
useEffect(() => {
  fetch('/api/messages/unread').then(r => r.json()).then(d => setMemberUnread(d.unread ?? 0))
}, [])
```

In the **mobile** bottom nav item map, wrap the icon with a badge for Messages:
```typescript
<span className="relative">
  {item.icon}
  {item.href === '/messages' && memberUnread > 0 && (
    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
  )}
</span>
```

In the **desktop** top nav Links, add a dot for Messages:
```typescript
<Link key={item.href} href={item.href}
  className={cn('relative text-sm transition-colors', path === item.href ? 'text-accent' : 'text-secondary hover:text-foreground')}>
  {item.label}
  {item.href === '/messages' && memberUnread > 0 && (
    <span className="absolute -top-0.5 -right-2 w-1.5 h-1.5 rounded-full bg-accent" />
  )}
</Link>
```

- [ ] **Step 4: Add "Message your gym" link to member profile page**

Read `app/(member)/profile/page.tsx` to understand its current structure, then add a link to `/messages` in an appropriate spot (e.g., near the end of the profile card or in a "Help" section):

```typescript
// Add this wherever it makes contextual sense in the profile page
import Link from 'next/link'

// Inside the JSX:
<Link
  href="/messages"
  className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
>
  <svg aria-hidden="true" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
  Message your gym
</Link>
```

- [ ] **Step 5: Commit**

```bash
git add components/layout/owner-sidebar.tsx \
        components/layout/member-nav.tsx \
        "app/(member)/profile/page.tsx"
git commit -m "feat: add Messages nav items with unread badges and profile page link"
```

---

## Task 9: End-to-End Manual Testing

- [ ] **Step 1: Member sends first message**

1. Sign in as a gym member → navigate to `/messages`
2. See "send first message" view
3. Type a message → click Send
4. Thread appears with message on the right

- [ ] **Step 2: Owner sees and replies**

1. Sign in as owner (different browser tab) → navigate to `/messages`
2. Member's conversation appears in the left panel with a preview snippet
3. Click the conversation → thread appears
4. Type a reply → send
5. Reply appears on the right

- [ ] **Step 3: Realtime — live updates**

1. Have both member and owner windows open
2. Member sends another message — owner's window shows it without refresh
3. Owner replies — member's window updates live

- [ ] **Step 4: Unread badges**

1. As owner, navigate to `/dashboard` after member sends a new message
2. Sidebar Messages icon shows unread dot
3. Return to Messages → open conversation → dot clears (PATCH /read fired)

- [ ] **Step 5: Profile page link**

1. As member, navigate to `/profile`
2. "Message your gym" link is visible
3. Click it → navigates to `/messages`

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete messaging system — two-way in-app member/owner chat"
```

---

## Notes for Implementer

**Supabase Realtime:** Enable the `messages` table in Supabase Dashboard > Database > Replication. This is required before Realtime subscriptions will receive INSERT events.

**TypeScript types:** The auto-generated `lib/supabase/types.ts` will not include the new tables until you run `npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts`. This is optional but eliminates the type casts in the route handlers.

**No test infrastructure exists in this codebase.** Manual testing (Task 9) is the validation strategy.

**`createAdminClient()`** is already in `lib/supabase/admin.ts`. All unread counter mutations in the route handlers use it.
