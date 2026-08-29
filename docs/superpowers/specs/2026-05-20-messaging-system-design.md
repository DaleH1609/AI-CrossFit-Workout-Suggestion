# Messaging System — Design Spec

## Goal

Allow members to send messages to their gym owner and receive replies, in-app. Two-way, real-time, general-purpose inbox.

## Architecture

Two new Supabase tables: `conversations` (one per member-gym pair) and `messages` (one per message). Supabase Realtime subscriptions deliver new messages instantly to both sides without polling. RLS restricts members to their own conversation and owners to conversations within their gym.

**Tech Stack:** Next.js App Router, Supabase (tables + RLS + Realtime), existing auth pattern

---

## Data Model

### `conversations`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `gym_id` | uuid FK → gyms | |
| `member_id` | uuid FK → users | unique per gym |
| `created_at` | timestamptz | |
| `last_message_at` | timestamptz | updated on each new message |
| `owner_unread` | int | incremented on member message, reset on owner open |
| `member_unread` | int | incremented on owner message, reset on member open |

Unique constraint: `(gym_id, member_id)`

### `messages`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `conversation_id` | uuid FK → conversations | |
| `gym_id` | uuid FK → gyms | denormalized — enables Realtime filter by gym_id without joining |
| `sender_id` | uuid FK → users | |
| `body` | text | max 2000 chars |
| `created_at` | timestamptz | |

> **Why `gym_id` on `messages`?** Supabase Realtime filters on a single table's columns. The owner subscribes to new messages filtered by `gym_id`; without this column the subscription would require a cross-table join, which Realtime does not support. It is set server-side from the conversation row and never trusted from the client.

### RLS Policies

**On `conversations`:**
- Members: `SELECT` where `member_id = auth.uid()`
- Owners: `SELECT` where `gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())`

**On `messages`:**
- Members INSERT: `sender_id = auth.uid()` AND `conversation_id` resolves to a conversation where `member_id = auth.uid()`
- Members SELECT: `conversation_id` resolves to a conversation where `member_id = auth.uid()`
- Owners SELECT/INSERT: `gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())`

> **Unread counter updates:** `owner_unread` and `member_unread` increments/resets on `conversations` require UPDATE permission. This cannot be granted to the regular user role (members could manipulate owner_unread; owners could manipulate member_unread). All unread mutations are performed using the **Supabase service-role client** exclusively in API route handlers — never from client-side code. The service-role client bypasses RLS.

No UPDATE/DELETE on messages (immutable — simpler and avoids confusion).

### SQL Migration Skeleton

```sql
-- conversations
CREATE TABLE conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  owner_unread  int NOT NULL DEFAULT 0,
  member_unread int NOT NULL DEFAULT 0,
  UNIQUE (gym_id, member_id)
);

-- messages
CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  gym_id          uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id),
  body            text NOT NULL CHECK (char_length(body) <= 2000),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- conversations: member can create their own conversation row
CREATE POLICY "member_insert_own_conversation" ON conversations
  FOR INSERT WITH CHECK (
    member_id = auth.uid() AND
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

-- conversations: member can see own row
CREATE POLICY "member_select_own_conversation" ON conversations
  FOR SELECT USING (member_id = auth.uid());

-- conversations: owner can see all conversations in their gym
CREATE POLICY "owner_select_gym_conversations" ON conversations
  FOR SELECT USING (
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

-- messages: member can insert their own messages into their own conversation
CREATE POLICY "member_insert_own_message" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations WHERE member_id = auth.uid()
    )
  );

-- messages: member can select messages in their own conversation
CREATE POLICY "member_select_own_messages" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE member_id = auth.uid()
    )
  );

-- messages: owner can select/insert messages in their gym
CREATE POLICY "owner_select_gym_messages" ON messages
  FOR SELECT USING (
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "owner_insert_gym_message" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );
```

---

## API Routes

### Auth Strategy

The `POST /api/messages` and `GET /api/messages` routes serve both members and owners. They use a raw `supabase.auth.getUser()` call followed by a role lookup in the `users` table (same as the existing `requireOwnerAuth` / `requireMemberAuth` helpers). The role check gates which code path executes:

```ts
// Pseudo-code for dual-role route guard
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const { data: userData } = await supabase
  .from('users')
  .select('gym_id, role, name, email, revoked_at')
  .eq('id', user.id)
  .single()

if (!userData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
if (userData.revoked_at) return NextResponse.json({ error: 'Revoked' }, { status: 403 })
// then branch on userData.role === 'owner' | 'member'
```

Unread counter mutations use a separate **service-role Supabase client** (created with `SUPABASE_SERVICE_ROLE_KEY`) to bypass RLS for UPDATE on `conversations`.

### `POST /api/messages` — send a message
- Auth: member or owner (dual-role, see above)
- Body: `{ body: string }` — members only (conversation auto-created if first); `{ body: string, conversationId: string }` — owners
- Members: upsert `conversations` row (INSERT ... ON CONFLICT DO NOTHING), insert message row (RLS-active client), then increment `owner_unread` and update `last_message_at` (service-role client: `owner_unread = owner_unread + 1`)
- Owners: insert message row (RLS-active client), then increment `member_unread` and update `last_message_at` (service-role client: `member_unread = member_unread + 1`)
- Returns: `{ message: MessageRow }`

### `GET /api/messages?conversationId=` — fetch messages
- Auth: member (own conversation only) or owner (any conversation in their gym)
- Returns last 100 messages ordered ascending
- Does **not** reset unread count — unread reset is a separate explicit call

### `PATCH /api/messages/conversations/[id]/read` — mark conversation as read
- Auth: member or owner (only resets the caller's own unread counter)
- Member: sets `member_unread = 0` on their conversation (service-role client)
- Owner: sets `owner_unread = 0` on the specified conversation (service-role client, must verify `gym_id` matches owner's gym first)
- Returns: `{ ok: true }`
- Called by the client when the thread or conversation is opened

> **Why a separate PATCH instead of side-effect in GET?** GET side-effects violate HTTP semantics, cause issues with prefetch/caching, and make it harder to reason about when counts reset. An explicit PATCH is idempotent, easy to test, and mirrors how other read-receipt systems work.

### `GET /api/messages/conversations` — list conversations (owner only)
- Auth: owner (`requireOwnerAuth`)
- Returns all conversations for the owner's gym, joined with member name/email, ordered by `last_message_at` desc

---

## Pages & Components

### Auth Guards
Layout files handle auth via `requireOwnerServerAuth()` / `requireMemberServerAuth()` (existing helpers). Page components themselves do **not** add a second auth guard — the layout already guarantees the user is authenticated and has the correct role before the page renders.

### Owner — `/messages`
- Added to owner sidebar nav (new "Messages" item with unread badge)
- **Layout**: two-column on desktop, stacked on mobile
  - Left: `ConversationList` — scrollable list of member conversations, each showing member name, last message preview, timestamp, unread dot
  - Right: `MessageThread` — full thread for selected conversation + reply box at bottom
- Realtime: subscribe to `messages` table filtered by `gym_id = <ownerGymId>` — new rows update the list and active thread live
- Unread badge on sidebar icon showing total `owner_unread` across all conversations

### Member — `/messages`
- Accessible from profile page (new "Message your gym" link) and member nav (new icon)
- Single-view: full thread + message input at bottom
- If no conversation exists yet, shows empty state with prompt to send first message
- Realtime: subscribe to `messages` table filtered by `conversation_id = <conversationId>` for live owner replies
- Member nav gets a subtle unread indicator when `member_unread > 0`

### Shared components
- `MessageBubble` — renders a single message, aligned left (other) or right (self), with timestamp
- `MessageInput` — textarea with send button, Cmd/Ctrl+Enter to submit, 2000 char limit
- `ConversationList` — owner-only list panel
- `MessageThread` — shared thread renderer used by both sides

---

## File Structure

```
app/
  (owner)/
    messages/
      page.tsx          — owner inbox (ConversationList + MessageThread)
      loading.tsx
      error.tsx
  (member)/
    messages/
      page.tsx          — member thread view
      loading.tsx
      error.tsx
app/api/
  messages/
    route.ts            — GET (fetch messages), POST (send message)
    conversations/
      route.ts          — GET (owner: list conversations)
      [id]/
        read/
          route.ts      — PATCH (mark conversation as read)
components/
  messages/
    conversation-list.tsx
    message-thread.tsx
    message-bubble.tsx
    message-input.tsx
supabase/migrations/
  XXX_add_messaging.sql  — conversations + messages tables + RLS
lib/supabase/
  service.ts            — createServiceClient() — service-role client for unread mutations
```

---

## Unread Counts

- When a member sends a message → `owner_unread = owner_unread + 1` (atomic SQL expression, service-role)
- When an owner sends a reply → `member_unread = member_unread + 1` (atomic SQL expression, service-role)
- When owner opens a conversation → `PATCH .../read` → `owner_unread = 0` (service-role)
- When member opens their thread → `PATCH .../read` → `member_unread = 0` (service-role)
- Owner sidebar badge = sum of all `owner_unread` across gym conversations
- Member nav indicator = `member_unread > 0`

All counter mutations use atomic SQL expressions (`col = col + 1`, `col = 0`) to prevent race conditions. Never read-then-write from application code.

---

## Error Handling

- Empty body → 400
- Body over 2000 chars → 400 (truncated client-side too as UX hint)
- Member tries to message a different gym's owner → 403 via RLS
- Owner tries to reply to a conversation not in their gym → 403 via RLS
- Realtime subscription failure → silent fallback (messages still load on mount, just no live updates)

---

## Out of Scope

- File/image attachments
- Message editing or deletion
- Member-to-member messaging
- Email notifications for new messages
- Read receipts per-message (only unread counts)
- Message search
- Rate limiting (future hardening)
