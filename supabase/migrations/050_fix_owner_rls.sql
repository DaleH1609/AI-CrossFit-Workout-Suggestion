-- Fix: several RLS policies only covered 'admin' role, not 'owner'.
-- Owners must be able to manage their own gym's data.

-- member_notes
DROP POLICY IF EXISTS "admins manage member notes" ON member_notes;
CREATE POLICY "admins and owners manage member notes"
  ON member_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_notes.gym_id
        AND users.role IN ('admin', 'owner')
    )
  );

-- member_skills (admin read)
DROP POLICY IF EXISTS "admins read gym skills" ON member_skills;
CREATE POLICY "admins and owners read gym skills"
  ON member_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_skills.gym_id
        AND users.role IN ('admin', 'owner')
    )
  );

-- wod_posts
DROP POLICY IF EXISTS "admins manage wod posts" ON wod_posts;
CREATE POLICY "admins and owners manage wod posts"
  ON wod_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = wod_posts.gym_id
        AND users.role IN ('admin', 'owner')
    )
  );

-- workout_edits
DROP POLICY IF EXISTS "admins manage workout edits" ON workout_edits;
CREATE POLICY "admins and owners manage workout edits"
  ON workout_edits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = workout_edits.gym_id
        AND users.role IN ('admin', 'owner')
    )
  );
