-- F5: Benchmark tracking (classic CrossFit benchmarks)
-- F13: Personal goals

-- Benchmark definitions
CREATE TABLE IF NOT EXISTS benchmarks (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name     text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'girl',  -- girl, hero, lift, gymnastics
  unit     text NOT NULL DEFAULT 'time'   -- time, reps, weight, rounds_reps
);

INSERT INTO benchmarks (name, category, unit) VALUES
  ('Fran',        'girl', 'time'),
  ('Helen',       'girl', 'time'),
  ('Grace',       'girl', 'time'),
  ('Diane',       'girl', 'time'),
  ('Elizabeth',   'girl', 'time'),
  ('Isabel',      'girl', 'time'),
  ('Karen',       'girl', 'time'),
  ('Chelsea',     'girl', 'rounds_reps'),
  ('Cindy',       'girl', 'rounds_reps'),
  ('Murph',       'hero', 'time'),
  ('DT',          'hero', 'time'),
  ('Clean 1RM',   'lift', 'weight'),
  ('Snatch 1RM',  'lift', 'weight'),
  ('Back Squat 1RM', 'lift', 'weight'),
  ('Deadlift 1RM', 'lift', 'weight'),
  ('Press 1RM',   'lift', 'weight'),
  ('Max Pull-ups', 'gymnastics', 'reps'),
  ('Max Double-Unders', 'gymnastics', 'reps')
ON CONFLICT (name) DO NOTHING;

-- Member benchmark results
CREATE TABLE IF NOT EXISTS benchmark_results (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  benchmark_id uuid NOT NULL REFERENCES benchmarks(id) ON DELETE CASCADE,
  score_value  text NOT NULL,     -- e.g. "2:45" or "225" or "23+5"
  rx           boolean NOT NULL DEFAULT true,
  notes        text,
  recorded_on  date NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE benchmark_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members manage own benchmark results"
  ON benchmark_results FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "admins read gym benchmark results"
  ON benchmark_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = benchmark_results.gym_id
        AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS benchmark_results_user ON benchmark_results(user_id, benchmark_id);

-- Personal goals
CREATE TABLE IF NOT EXISTS personal_goals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  target      text NOT NULL,         -- e.g. "Sub 3:00 Fran" or "BW Clean"
  achieved    boolean NOT NULL DEFAULT false,
  achieved_at timestamptz,
  due_date    date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE personal_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members manage own goals"
  ON personal_goals FOR ALL
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS personal_goals_user ON personal_goals(user_id);
