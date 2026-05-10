-- 043_onboarding.sql
-- F11 + F37: Member onboarding checklist + 6-class Intro to CrossFit curriculum

-- Tracks which onboarding steps each member has completed
CREATE TABLE IF NOT EXISTS member_onboarding (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step        text NOT NULL,   -- 'profile', 'waiver', 'first_booking', 'intro_video', 'intro_class_1'...'intro_class_6'
  completed_at timestamptz NOT NULL DEFAULT now(),
  notes       text,
  UNIQUE (gym_id, user_id, step)
);

CREATE INDEX IF NOT EXISTS member_onboarding_user_id_idx ON member_onboarding (user_id);

ALTER TABLE member_onboarding ENABLE ROW LEVEL SECURITY;

-- Members see their own progress
CREATE POLICY "members read own onboarding"
  ON member_onboarding FOR SELECT
  USING (auth.uid() = user_id);

-- Members can complete their own steps (self-serve: profile, waiver, first_booking, intro_video)
CREATE POLICY "members complete own steps"
  ON member_onboarding FOR INSERT
  WITH CHECK (auth.uid() = user_id AND step IN ('profile', 'waiver', 'first_booking', 'intro_video'));

-- Admins/coaches can manage all onboarding for their gym (for marking intro_class_N steps)
CREATE POLICY "admins manage member onboarding"
  ON member_onboarding
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.gym_id = member_onboarding.gym_id
        AND u.role IN ('admin', 'owner', 'coach')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.gym_id = member_onboarding.gym_id
        AND u.role IN ('admin', 'owner', 'coach')
    )
  );
