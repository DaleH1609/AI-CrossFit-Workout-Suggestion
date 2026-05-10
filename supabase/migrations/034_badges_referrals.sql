-- F30: Achievement badges
-- F32: Member referral tracking

-- Badge definitions (seeded, gym-agnostic for now)
CREATE TABLE IF NOT EXISTS badge_definitions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text NOT NULL,
  icon        text NOT NULL DEFAULT '🏅',  -- emoji
  threshold   int  NOT NULL DEFAULT 1      -- e.g. 100 classes
);

INSERT INTO badge_definitions (slug, name, description, icon, threshold) VALUES
  ('first-class',    'First Class',    'Completed your first class',       '🎯', 1),
  ('10-classes',     '10 Classes',     'Attended 10 classes',              '🔥', 10),
  ('25-classes',     '25 Classes',     'Attended 25 classes',              '💪', 25),
  ('50-classes',     '50 Classes',     'Attended 50 classes',              '⚡', 50),
  ('100-classes',    '100 Classes',    'Attended 100 classes',             '🏆', 100),
  ('250-classes',    '250 Classes',    'Attended 250 classes',             '🌟', 250),
  ('week-streak-2',  '2-Week Streak',  'Attended class every week for 2 weeks', '📅', 14),
  ('week-streak-4',  '4-Week Streak',  'Attended class every week for 4 weeks', '🗓️', 28)
ON CONFLICT (slug) DO NOTHING;

-- Member earned badges
CREATE TABLE IF NOT EXISTS member_badges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id     uuid NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gym_id, user_id, badge_id)
);

ALTER TABLE member_badges ENABLE ROW LEVEL SECURITY;

-- Members can read own badges
CREATE POLICY "members read own badges"
  ON member_badges FOR SELECT
  USING (user_id = auth.uid());

-- Admins can read all badges in their gym
CREATE POLICY "admins read gym badges"
  ON member_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_badges.gym_id
        AND users.role = 'admin'
    )
  );

-- System/service role can insert badges (called from API)
CREATE POLICY "service insert badges"
  ON member_badges FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS member_badges_user ON member_badges(user_id);

-- Referral tracking
CREATE TABLE IF NOT EXISTS referrals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  referrer_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  referred_email text NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'joined', 'credited')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Members can read referrals they made
CREATE POLICY "members read own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid());

-- Members can insert referrals
CREATE POLICY "members insert referrals"
  ON referrals FOR INSERT
  WITH CHECK (referrer_id = auth.uid());

-- Admins can manage all referrals in their gym
CREATE POLICY "admins manage referrals"
  ON referrals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = referrals.gym_id
        AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_gym ON referrals(gym_id);
