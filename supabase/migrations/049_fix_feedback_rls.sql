-- Fix: class_feedback RLS policy only covered 'admin' role, not 'owner'.
-- Owners need to read feedback for the reports page.
DROP POLICY IF EXISTS "admins read gym feedback" ON class_feedback;

CREATE POLICY "owners and admins read gym feedback"
  ON class_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = class_feedback.gym_id
        AND users.role IN ('admin', 'owner')
    )
  );
