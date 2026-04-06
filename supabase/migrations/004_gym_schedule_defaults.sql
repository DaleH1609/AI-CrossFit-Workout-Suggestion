-- supabase/migrations/004_gym_schedule_defaults.sql
CREATE TABLE gym_schedule_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  day_of_week int CHECK (day_of_week IS NULL OR (day_of_week >= 1 AND day_of_week <= 7)),
  default_capacity int NOT NULL DEFAULT 20,
  UNIQUE (gym_id, day_of_week)
);

ALTER TABLE gym_schedule_defaults ENABLE ROW LEVEL SECURITY;

-- Owners can read/write their own gym's defaults
CREATE POLICY "owner_manage_defaults" ON gym_schedule_defaults
  FOR ALL USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );

-- Members can read (needed to resolve effective capacity for display)
CREATE POLICY "member_read_defaults" ON gym_schedule_defaults
  FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid())
  );
