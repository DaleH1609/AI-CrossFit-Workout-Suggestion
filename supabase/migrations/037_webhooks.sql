-- F43: Slack/Discord webhook integration

CREATE TABLE IF NOT EXISTS gym_webhooks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id     uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  platform   text NOT NULL CHECK (platform IN ('slack', 'discord', 'custom')),
  url        text NOT NULL,
  label      text NOT NULL DEFAULT '',
  events     text[] NOT NULL DEFAULT ARRAY['workout_published'],  -- events to trigger on
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gym_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage gym webhooks"
  ON gym_webhooks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = gym_webhooks.gym_id
        AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS gym_webhooks_gym ON gym_webhooks(gym_id);
