-- 024_booking_atomic_hardening.sql
--
-- Hardens insert_booking_atomic (introduced in 023) with three defence-in-depth
-- fixes identified in the round-3 security review (R4):
--
-- 1. auth.role() guard — mirrors the save_workout_draft pattern from N8. If
--    authenticated is ever re-granted EXECUTE (as happened before migration 015),
--    any logged-in member could supply arbitrary p_gym_id / p_capacity values.
--    The guard raises immediately before any state change.
--
-- 2. Drop p_capacity parameter — capacity is now read directly from
--    class_instances inside the FOR UPDATE lock. A caller cannot influence the
--    cap check by supplying a fake value (e.g. p_capacity = 999999).
--
-- 3. Cross-check p_gym_id against the instance row — prevents a caller from
--    passing an instance from gym A with a gym_id of gym B, which would create a
--    booking whose gym_id is inconsistent with its instance.
--
-- Route handler updated in the same commit to drop the p_capacity argument.

CREATE OR REPLACE FUNCTION insert_booking_atomic(
  p_gym_id            uuid,
  p_instance_id       uuid,
  p_user_id           uuid,
  p_waitlist_enabled  boolean,
  p_max_waitlist      int,
  p_existing_id       uuid    -- non-null = re-booking an existing cancelled row
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_capacity          int;
  v_confirmed_count   int;
  v_waitlist_count    int;
  v_status            text;
  v_waitlist_position int;
  v_booking_id        uuid;
BEGIN
  -- Defence-in-depth: if somehow an authenticated (non-service-role) caller
  -- reaches this SECURITY DEFINER function, verify identity and gym membership.
  IF auth.role() != 'service_role' THEN
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'insert_booking_atomic: user_id mismatch for caller %', auth.uid();
    END IF;
    IF p_gym_id IS DISTINCT FROM (
      SELECT gym_id FROM users WHERE id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'insert_booking_atomic: gym_id mismatch for caller %', auth.uid();
    END IF;
  END IF;

  -- Serialize concurrent bookings and read capacity atomically from the locked
  -- row. This replaces the caller-supplied p_capacity parameter (R4): the DB
  -- itself is the authoritative source of capacity under the lock.
  -- Also cross-checks gym_id so an instance from another gym is rejected.
  SELECT capacity INTO v_capacity
  FROM class_instances
  WHERE id = p_instance_id
    AND gym_id = p_gym_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Count active bookings atomically inside the lock.
  SELECT
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'pending_confirmation')),
    COUNT(*) FILTER (WHERE status = 'waitlisted')
  INTO v_confirmed_count, v_waitlist_count
  FROM bookings
  WHERE instance_id = p_instance_id
    AND status IN ('confirmed', 'pending_confirmation', 'waitlisted');

  -- Determine outcome.
  IF v_confirmed_count >= v_capacity THEN
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
      AND user_id = p_user_id
      AND gym_id  = p_gym_id;  -- extra: existing row must belong to same gym
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

GRANT EXECUTE ON FUNCTION insert_booking_atomic(uuid, uuid, uuid, boolean, int, uuid) TO service_role;
-- Revoke the old 7-argument signature (p_capacity was the 4th parameter).
-- This prevents the old route code from accidentally calling the unguarded version.
REVOKE ALL ON FUNCTION insert_booking_atomic(uuid, uuid, uuid, int, boolean, int, uuid) FROM PUBLIC;
DROP FUNCTION IF EXISTS insert_booking_atomic(uuid, uuid, uuid, int, boolean, int, uuid);
