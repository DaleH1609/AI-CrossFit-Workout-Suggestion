-- The original unique(gym_id, week_start, status) constraint prevents having
-- more than one row of each status per week, which breaks regeneration workflows:
--   1. Generate → draft
--   2. Approve → draft becomes published
--   3. Regenerate → new draft (ok)
--   4. Approve again → fails because (gym_id, week_start, 'published') already exists
--
-- Fix: replace with partial unique indexes that only enforce uniqueness
-- for 'draft' and 'published' statuses, allowing many 'discarded' rows.

-- Drop the old full constraint
ALTER TABLE workout_weeks
  DROP CONSTRAINT IF EXISTS workout_weeks_gym_id_week_start_status_key;

-- Only one active draft per gym per week
CREATE UNIQUE INDEX IF NOT EXISTS workout_weeks_one_draft
  ON workout_weeks (gym_id, week_start)
  WHERE status = 'draft';

-- Only one published week per gym per week
CREATE UNIQUE INDEX IF NOT EXISTS workout_weeks_one_published
  ON workout_weeks (gym_id, week_start)
  WHERE status = 'published';

-- Update the save_workout_draft function to use the new index structure
CREATE OR REPLACE FUNCTION save_workout_draft(
  p_gym_id uuid,
  p_week_start date,
  p_workouts jsonb
) RETURNS workout_weeks AS $$
DECLARE
  result workout_weeks;
BEGIN
  -- Remove any existing draft for this gym+week (partial index allows only one)
  DELETE FROM workout_weeks
  WHERE gym_id = p_gym_id
    AND week_start = p_week_start
    AND status = 'draft';

  -- Insert fresh draft
  INSERT INTO workout_weeks (gym_id, week_start, workouts, status)
  VALUES (p_gym_id, p_week_start, p_workouts, 'draft')
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO authenticated;
