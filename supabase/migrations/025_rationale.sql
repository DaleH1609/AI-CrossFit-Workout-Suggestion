-- F1: Add rationale column to workout_weeks for AI programming explanations
ALTER TABLE workout_weeks ADD COLUMN IF NOT EXISTS rationale jsonb;

-- Update save_workout_draft to optionally accept a rationale parameter
CREATE OR REPLACE FUNCTION save_workout_draft(
  p_gym_id uuid,
  p_week_start date,
  p_workouts jsonb,
  p_rationale jsonb DEFAULT NULL
) RETURNS workout_weeks AS $$
DECLARE
  result workout_weeks;
BEGIN
  -- Guard: only the application service_role (or authenticated via RLS owner check) should call this.
  -- The generation API already verifies owner auth before calling.
  IF auth.role() = 'anon' THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  DELETE FROM workout_weeks
  WHERE gym_id = p_gym_id
    AND week_start = p_week_start
    AND status = 'draft';

  INSERT INTO workout_weeks (gym_id, week_start, workouts, status, rationale)
  VALUES (p_gym_id, p_week_start, p_workouts, 'draft', p_rationale)
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb, jsonb) TO authenticated;
-- Keep old 3-arg signature working (backwards compat during rollout)
GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO authenticated;
