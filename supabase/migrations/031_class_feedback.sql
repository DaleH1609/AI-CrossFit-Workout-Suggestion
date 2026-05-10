-- F33: Post-class feedback (star rating + optional comment)
CREATE TABLE IF NOT EXISTS class_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(instance_id, user_id)
);

ALTER TABLE class_feedback ENABLE ROW LEVEL SECURITY;

-- Members can insert/update own feedback
CREATE POLICY "members manage own feedback"
  ON class_feedback
  FOR ALL
  USING (user_id = auth.uid());

-- Admins can read all feedback in their gym
CREATE POLICY "admins read gym feedback"
  ON class_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = class_feedback.gym_id
        AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS class_feedback_instance ON class_feedback(instance_id);
