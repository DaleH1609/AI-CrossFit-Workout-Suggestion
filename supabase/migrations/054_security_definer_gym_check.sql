-- N8: Defence-in-depth for save_workout_draft SECURITY DEFINER
--
-- EXECUTE is already revoked from `authenticated` (migration 015), so only
-- service_role callers can invoke this function. However, if a future migration
-- accidentally re-grants access to authenticated, the function would trust the
-- caller-supplied p_gym_id — potentially allowing cross-tenant writes.
--
-- Fix: add an in-function guard that raises if the calling role is not
-- service_role AND the supplied gym_id doesn't match the caller's own gym.
-- Service-role callers (route handlers) bypass this check intentionally,
-- since they have already verified ownership before calling.

CREATE OR REPLACE FUNCTION save_workout_draft(
  p_gym_id uuid,
  p_week_start date,
  p_workouts jsonb
) RETURNS workout_weeks AS $$
DECLARE
  result workout_weeks;
  caller_gym_id uuid;
BEGIN
  -- Defence-in-depth: if called by an authenticated user (not service_role),
  -- verify they belong to the gym they're trying to write.
  IF current_setting('role', true) != 'service_role' THEN
    SELECT gym_id INTO caller_gym_id FROM users WHERE id = auth.uid();
    IF caller_gym_id IS NULL OR caller_gym_id != p_gym_id THEN
      RAISE EXCEPTION 'save_workout_draft: gym_id mismatch or unauthenticated caller';
    END IF;
  END IF;

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


-- N9: Lock `email` in member profile UPDATE policy
--
-- Members could previously change `users.email` directly via Supabase REST,
-- desynchronising it from auth.users.email and redirecting booking/revocation
-- emails to an arbitrary address. Lock it to its current value.

DROP POLICY IF EXISTS "member updates own profile" ON users;

CREATE POLICY "member updates own profile" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role     = (SELECT role     FROM users WHERE id = auth.uid())
    AND gym_id   = (SELECT gym_id   FROM users WHERE id = auth.uid())
    AND email    = (SELECT email    FROM users WHERE id = auth.uid())
    AND revoked_at IS NOT DISTINCT FROM (SELECT revoked_at FROM users WHERE id = auth.uid())
  );
