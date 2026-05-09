-- F4: Workout score logging
-- F29: Daily leaderboard

CREATE TABLE IF NOT EXISTS workout_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Link to the class instance (optional — can log without being booked)
  instance_id uuid REFERENCES class_instances(id) ON DELETE SET NULL,
  -- The date of the workout (for grouping leaderboards)
  workout_date date NOT NULL,
  -- Score fields
  score_type text NOT NULL CHECK (score_type IN ('time', 'reps', 'weight', 'rounds_reps', 'distance', 'calories', 'pass_fail', 'notes_only')),
  score_value numeric,         -- numeric for time (seconds), reps, weight, distance, calories
  score_text text,             -- for rounds_reps ("12+5") and notes_only
  rx boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One score per user per workout date (can update)
  UNIQUE(user_id, workout_date)
);

CREATE INDEX IF NOT EXISTS workout_scores_gym_date_idx ON workout_scores(gym_id, workout_date);
CREATE INDEX IF NOT EXISTS workout_scores_user_idx ON workout_scores(user_id);

-- RLS
ALTER TABLE workout_scores ENABLE ROW LEVEL SECURITY;

-- Members can insert/update their own score for their gym
CREATE POLICY "member inserts own score" ON workout_scores
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "member updates own score" ON workout_scores
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Members can read all scores for their gym (for leaderboard)
CREATE POLICY "member reads gym scores" ON workout_scores
  FOR SELECT USING (
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

-- Owners can read all scores in their gym
CREATE POLICY "owner reads gym scores" ON workout_scores
  FOR SELECT USING (
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );
