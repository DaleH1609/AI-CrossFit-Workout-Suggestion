-- 042_measurements.sql
-- Body composition / measurement tracking (private — member sees only their own)

CREATE TABLE IF NOT EXISTS measurements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg   numeric(6,2),
  body_fat_pct numeric(5,2),
  muscle_mass_kg numeric(6,2),
  chest_cm    numeric(5,1),
  waist_cm    numeric(5,1),
  hips_cm     numeric(5,1),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS measurements_user_id_date_idx ON measurements (user_id, measured_at DESC);

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

-- Members manage their own measurements only
CREATE POLICY "members manage own measurements"
  ON measurements
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
