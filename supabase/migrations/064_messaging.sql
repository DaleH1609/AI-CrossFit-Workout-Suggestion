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

-- Atomic unread counter RPCs

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
