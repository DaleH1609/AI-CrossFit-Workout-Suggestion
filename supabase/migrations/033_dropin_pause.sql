-- F22: Drop-in / trial pass
-- F23: Membership pause

-- Drop-in passes (one-off or trial)
CREATE TABLE IF NOT EXISTS dropin_passes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pass_type   text NOT NULL CHECK (pass_type IN ('dropin', 'trial')),
  uses_total  smallint NOT NULL DEFAULT 1,   -- how many classes included
  uses_used   smallint NOT NULL DEFAULT 0,
  expires_at  date,                          -- NULL = never
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dropin_passes ENABLE ROW LEVEL SECURITY;

-- Members can read own passes
CREATE POLICY "members read own passes"
  ON dropin_passes FOR SELECT
  USING (user_id = auth.uid());

-- Admins manage all passes in their gym
CREATE POLICY "admins manage passes"
  ON dropin_passes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = dropin_passes.gym_id
        AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS dropin_passes_user ON dropin_passes(user_id);
CREATE INDEX IF NOT EXISTS dropin_passes_gym ON dropin_passes(gym_id);

-- Membership pause
CREATE TABLE IF NOT EXISTS membership_pauses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id     uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pause_from date NOT NULL,
  pause_to   date NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (pause_to > pause_from)
);

ALTER TABLE membership_pauses ENABLE ROW LEVEL SECURITY;

-- Members can read own pauses
CREATE POLICY "members read own pauses"
  ON membership_pauses FOR SELECT
  USING (user_id = auth.uid());

-- Admins manage all pauses in their gym
CREATE POLICY "admins manage pauses"
  ON membership_pauses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = membership_pauses.gym_id
        AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS membership_pauses_user ON membership_pauses(user_id);
