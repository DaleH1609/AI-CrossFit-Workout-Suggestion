-- Collapse save_workout_draft to a single signature.
--
-- Creating a manual week failed with a 500. The underlying error was
-- PostgREST PGRST203:
--
--   Could not choose the best candidate function between:
--     public.save_workout_draft(p_gym_id, p_week_start, p_workouts),
--     public.save_workout_draft(p_gym_id, p_week_start, p_workouts, p_rationale)
--
-- Migration 025 added the 4-argument form with `p_rationale jsonb DEFAULT NULL`
-- and deliberately kept the 3-argument form "for backwards compat during
-- rollout". Because the fourth argument has a default, a 3-argument call
-- matches both candidates, and PostgREST refuses to guess rather than pick one
-- arbitrarily. Every 3-argument caller has therefore been failing —
-- app/api/workouts/create-manual/route.ts is the one users hit.
--
-- The two bodies had also drifted apart on security, so this is not simply a
-- matter of dropping either one:
--
--   * the 3-arg form (migration 054) carries the stronger guard — it compares
--     the caller's own gym_id against p_gym_id — but cannot write rationale;
--   * the 4-arg form (migration 025) writes rationale but guards only with
--     `auth.role() = 'anon'`, which Supabase deprecates: anonymous sign-ins
--     carry the `authenticated` role and pass that check.
--
-- So: keep the 4-argument signature, give it migration 054's guard, and drop
-- the 3-argument form. One function, no ambiguity, and the better of the two
-- security postures rather than whichever happened to survive.

DROP FUNCTION IF EXISTS public.save_workout_draft(uuid, date, jsonb);

CREATE OR REPLACE FUNCTION public.save_workout_draft(
  p_gym_id     uuid,
  p_week_start date,
  p_workouts   jsonb,
  p_rationale  jsonb DEFAULT NULL
) RETURNS public.workout_weeks
LANGUAGE plpgsql
SECURITY DEFINER
-- Empty search_path so the body cannot be redirected by a caller-set path.
-- Every reference below is schema-qualified accordingly. Also clears one of
-- the outstanding function_search_path_mutable advisor findings.
SET search_path = ''
AS $$
DECLARE
  result        public.workout_weeks;
  caller_gym_id uuid;
BEGIN
  -- Defence-in-depth. EXECUTE is granted to service_role only (migration 067),
  -- so this should be unreachable; it exists so that a future migration
  -- re-granting `authenticated` cannot silently enable cross-tenant writes.
  -- Route handlers run as service_role and have already verified ownership.
  IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    SELECT gym_id INTO caller_gym_id FROM public.users WHERE id = auth.uid();
    IF caller_gym_id IS NULL OR caller_gym_id <> p_gym_id THEN
      RAISE EXCEPTION 'save_workout_draft: gym_id mismatch or unauthenticated caller';
    END IF;
  END IF;

  -- One draft per gym per week; a partial unique index enforces this.
  DELETE FROM public.workout_weeks
   WHERE gym_id = p_gym_id
     AND week_start = p_week_start
     AND status = 'draft';

  INSERT INTO public.workout_weeks (gym_id, week_start, workouts, status, rationale)
  VALUES (p_gym_id, p_week_start, p_workouts, 'draft', p_rationale)
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- Match migration 067: nothing but the server may call this.
REVOKE ALL ON FUNCTION public.save_workout_draft(uuid, date, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_workout_draft(uuid, date, jsonb, jsonb)
  TO service_role;
