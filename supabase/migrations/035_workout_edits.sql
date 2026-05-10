-- F2: AI learns from edits — track what coaches change after generation

CREATE TABLE IF NOT EXISTS workout_edits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  week_start   date NOT NULL,
  day_name     text NOT NULL,          -- Monday, Tuesday, etc.
  field        text NOT NULL,          -- title, description, notes, etc.
  before_text  text NOT NULL,
  after_text   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_edits_gym_week ON workout_edits(gym_id, week_start DESC);

ALTER TABLE workout_edits ENABLE ROW LEVEL SECURITY;

-- Admins can insert and read edits for their gym
CREATE POLICY "admins manage workout edits"
  ON workout_edits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = workout_edits.gym_id
        AND users.role = 'admin'
    )
  );
