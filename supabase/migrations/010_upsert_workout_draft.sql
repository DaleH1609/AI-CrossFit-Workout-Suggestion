-- Atomic upsert for workout drafts — bypasses RLS via SECURITY DEFINER
-- Called from the generate API route to avoid unique constraint conflicts
CREATE OR REPLACE FUNCTION save_workout_draft(
  p_gym_id uuid,
  p_week_start date,
  p_workouts jsonb
) RETURNS workout_weeks AS $$
DECLARE
  result workout_weeks;
BEGIN
  -- Delete any existing draft for this gym+week (atomic, no race condition)
  DELETE FROM workout_weeks
  WHERE gym_id = p_gym_id
    AND week_start = p_week_start
    AND status = 'draft';

  -- Insert fresh draft and return the new row
  INSERT INTO workout_weeks (gym_id, week_start, workouts, status)
  VALUES (p_gym_id, p_week_start, p_workouts, 'draft')
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow service_role and authenticated users to call this function
GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO authenticated;
