-- F17: Coach-private member notes
-- F35: Skill tracker

-- Coach notes (admin-only, not visible to members)
CREATE TABLE IF NOT EXISTS member_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_notes_gym_member ON member_notes(gym_id, member_id);

ALTER TABLE member_notes ENABLE ROW LEVEL SECURITY;

-- Only admins of the gym can read/write notes
CREATE POLICY "admins manage member notes"
  ON member_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_notes.gym_id
        AND users.role = 'admin'
    )
  );

-- Skill tracker
CREATE TABLE IF NOT EXISTS skills (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name     text NOT NULL,
  category text NOT NULL DEFAULT 'gymnastics',  -- gymnastics, weightlifting, conditioning
  UNIQUE(name)
);

-- Seed common CrossFit skills
INSERT INTO skills (name, category) VALUES
  ('Double-Unders', 'gymnastics'),
  ('Pull-ups', 'gymnastics'),
  ('Chest-to-Bar Pull-ups', 'gymnastics'),
  ('Bar Muscle-ups', 'gymnastics'),
  ('Ring Muscle-ups', 'gymnastics'),
  ('Handstand Push-ups', 'gymnastics'),
  ('Strict Handstand Push-ups', 'gymnastics'),
  ('Handstand Walk', 'gymnastics'),
  ('Toes-to-Bar', 'gymnastics'),
  ('Rope Climb', 'gymnastics'),
  ('Pistol Squats', 'gymnastics'),
  ('Box Jump (24/20)', 'gymnastics'),
  ('Snatch', 'weightlifting'),
  ('Clean', 'weightlifting'),
  ('Clean & Jerk', 'weightlifting'),
  ('Overhead Squat', 'weightlifting'),
  ('Thruster', 'weightlifting'),
  ('Row 500m', 'conditioning'),
  ('Run 400m', 'conditioning'),
  ('Assault Bike', 'conditioning')
ON CONFLICT (name) DO NOTHING;

-- Member skill levels per gym
CREATE TABLE IF NOT EXISTS member_skills (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id     uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id   uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level      text NOT NULL CHECK (level IN ('none', 'learning', 'rx', 'advanced')),
  notes      text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gym_id, user_id, skill_id)
);

ALTER TABLE member_skills ENABLE ROW LEVEL SECURITY;

-- Members can read/write their own skills
CREATE POLICY "members manage own skills"
  ON member_skills
  FOR ALL
  USING (user_id = auth.uid());

-- Admins can read all skills in their gym
CREATE POLICY "admins read gym skills"
  ON member_skills
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_skills.gym_id
        AND users.role = 'admin'
    )
  );
