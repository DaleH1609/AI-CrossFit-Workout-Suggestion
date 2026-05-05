-- 023_db_correctness.sql
--
-- Bundles three DB-correctness fixes from the 2026-05-05 security review.
--
-- N8: save_workout_draft — add in-function gym_id ownership check.
--     REVOKE from authenticated already happened in 015, but a future
--     migration could re-grant it. The function now validates that non-
--     service-role callers own the gym they're writing to.
--
-- N9: users RLS — lock email to prevent header-injection and invite
--     enumeration via public.users.email desync.
--
-- N10: insert_booking_atomic — replaces the racy count-insert-recount
--     pattern with a single transaction that holds a row lock on the
--     class_instances row for the duration of the capacity check.

-- ─── N8: save_workout_draft gym ownership guard ─────────────────────────────

CREATE OR REPLACE FUNCTION save_workout_draft(
  p_gym_id uuid,
  p_week_start date,
  p_workouts jsonb
) RETURNS workout_weeks AS $$
DECLARE
  result workout_weeks;
BEGIN
  -- Defence-in-depth: if somehow an authenticated (non-service-role) caller
  -- reaches this SECURITY DEFINER function, verify they own the gym.
  -- Service-role callers (the generate/create-manual routes) bypass this.
  IF auth.role() != 'service_role' THEN
    IF p_gym_id IS DISTINCT FROM (
      SELECT gym_id FROM users WHERE id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'save_workout_draft: gym_id mismatch for caller %', auth.uid();
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
-- authenticated remains revoked (see 015_security_hardening.sql)


-- ─── N9: lock users.email in member update RLS ──────────────────────────────
-- Members could change public.users.email directly via the Supabase REST API,
-- causing desync with auth.users.email, enabling invite enumeration, and
-- misdirecting system emails. The email column is now locked alongside role,
-- gym_id, and revoked_at.

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


-- ─── N10: atomic booking insert ─────────────────────────────────────────────
-- Replaces the racy count → insert → recount pattern in app/api/bookings/route.ts.
-- Holds a FOR UPDATE lock on the class_instances row so concurrent requests
-- serialize at the capacity check rather than racing past it.
--
-- Returns jsonb:
--   { "booking_id": uuid, "status": text, "waitlist_position": int|null }
--   { "error": "class_full" | "waitlist_full" }

CREATE OR REPLACE FUNCTION insert_booking_atomic(
  p_gym_id            uuid,
  p_instance_id       uuid,
  p_user_id           uuid,
  p_capacity          int,
  p_waitlist_enabled  boolean,
  p_max_waitlist      int,
  p_existing_id       uuid    -- non-null = re-booking an existing cancelled row
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_confirmed_count   int;
  v_waitlist_count    int;
  v_status            text;
  v_waitlist_position int;
  v_booking_id        uuid;
BEGIN
  -- Serialize concurrent bookings for this instance by locking its row.
  PERFORM 1 FROM class_instances WHERE id = p_instance_id FOR UPDATE;

  -- Count active bookings atomically inside the lock.
  SELECT
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'pending_confirmation')),
    COUNT(*) FILTER (WHERE status = 'waitlisted')
  INTO v_confirmed_count, v_waitlist_count
  FROM bookings
  WHERE instance_id = p_instance_id
    AND status IN ('confirmed', 'pending_confirmation', 'waitlisted');

  -- Determine outcome.
  IF v_confirmed_count >= p_capacity THEN
    IF NOT p_waitlist_enabled THEN
      RETURN jsonb_build_object('error', 'class_full');
    END IF;
    IF v_waitlist_count >= p_max_waitlist THEN
      RETURN jsonb_build_object('error', 'waitlist_full');
    END IF;
    v_status := 'waitlisted';
    v_waitlist_position := v_waitlist_count + 1;
  ELSE
    v_status := 'confirmed';
    v_waitlist_position := NULL;
  END IF;

  -- Insert or un-cancel.
  IF p_existing_id IS NOT NULL THEN
    UPDATE bookings
    SET status              = v_status,
        waitlist_position   = v_waitlist_position,
        cancelled_at        = NULL,
        confirmation_expires_at = NULL
    WHERE id      = p_existing_id
      AND user_id = p_user_id;  -- extra safety: caller must own the row
    v_booking_id := p_existing_id;
  ELSE
    INSERT INTO bookings (gym_id, instance_id, user_id, status, waitlist_position)
    VALUES (p_gym_id, p_instance_id, p_user_id, v_status, v_waitlist_position)
    RETURNING id INTO v_booking_id;
  END IF;

  RETURN jsonb_build_object(
    'booking_id',        v_booking_id,
    'status',            v_status,
    'waitlist_position', v_waitlist_position
  );
END;
$$;

GRANT EXECUTE ON FUNCTION insert_booking_atomic(uuid, uuid, uuid, int, boolean, int, uuid) TO service_role;
