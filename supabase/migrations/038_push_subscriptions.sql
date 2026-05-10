-- 038_push_subscriptions.sql
-- Web Push subscriptions for browser push notifications

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth_key    text NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Members manage their own subscriptions
CREATE POLICY "members manage own push subscriptions"
  ON push_subscriptions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all subscriptions for their gym (for sending)
CREATE POLICY "admins read gym push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.gym_id = push_subscriptions.gym_id
        AND u.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS push_subscriptions_gym_id_idx ON push_subscriptions (gym_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions (user_id);
