-- 039_coach_role.sql
-- Adds coach role: can take attendance for assigned classes, read member skills/notes.
-- Cannot see billing or invite members.

-- Expand the role check constraint to allow 'coach'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'member', 'coach'));

-- Add coach_id to class_instances (nullable — unassigned classes have no coach)
ALTER TABLE class_instances ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- Index for coach's upcoming classes query
CREATE INDEX IF NOT EXISTS class_instances_coach_id_idx ON class_instances (coach_id, starts_at);

-- ─── RLS policies for coaches ─────────────────────────────────────────────────

-- Coaches can read class_instances assigned to them
CREATE POLICY "coaches read assigned class instances"
  ON class_instances FOR SELECT
  USING (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'coach'
    )
  );

-- Coaches can read bookings for their assigned classes (to take attendance)
CREATE POLICY "coaches read bookings for assigned classes"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_instances ci
      WHERE ci.id = bookings.instance_id
        AND ci.coach_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'coach'
    )
  );

-- Coaches can update attendance on bookings for their assigned classes
CREATE POLICY "coaches update attendance for assigned classes"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM class_instances ci
      WHERE ci.id = bookings.instance_id
        AND ci.coach_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'coach'
    )
  );

-- Coaches can read member skills for their gym
CREATE POLICY "coaches read member skills"
  ON member_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'coach'
        AND u.gym_id = member_skills.gym_id
    )
  );

-- Coaches can read member notes for their gym
CREATE POLICY "coaches read member notes"
  ON member_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'coach'
        AND u.gym_id = member_notes.gym_id
    )
  );

-- Coaches can read users in their gym (to see who's booked)
CREATE POLICY "coaches read gym members"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users me
      WHERE me.id = auth.uid()
        AND me.role = 'coach'
        AND me.gym_id = users.gym_id
    )
  );
