-- 056_booking_atomic_self_discover_existing.sql
--
-- K8: Move the cancelled-booking lookup inside insert_booking_atomic so it
-- runs under the FOR UPDATE lock, eliminating the race window in the route
-- handler (app/api/bookings/route.ts:84-86).
--
-- Before this migration the route did:
--   1. SELECT id FROM bookings WHERE … status = 'cancelled'   ← outside lock
--   2. rpc('insert_booking_atomic', { …, p_existing_id })     ← takes lock
--
-- Two concurrent re-bookings of the same cancelled row could both complete
-- step 1 and see the same existing id, then both call step 2. The second
-- call's UPDATE would silently no-op (row is no longer cancelled) and return
-- the id of a booking whose status was already set by the first call. The
-- caller believed it succeeded at one status but the actual state was the
-- other call's value.
--
-- Fix: drop p_existing_id from the signature. The function now discovers the
-- cancelled row itself, after the FOR UPDATE lock on class_instances is held,
-- so no concurrent call can race past the check.
--
-- The 5-argument signature replaces the 6-argument one. The old signature is
-- revoked and dropped to prevent accidental calls from stale route code.

CREATE OR REPLACE FUNCTION insert_booking_atomic(
  p_gym_id            uuid,
  p_instance_id       uuid,
  p_user_id           uuid,
  p_waitlist_enabled  boolean,
  p_max_waitlist      int
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
  v_existing_id       uuid;
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

  -- Serialize concurrent bookings and read capacity atomically.
  -- The FOR UPDATE lock on class_instances serialises all concurrent bookings
  -- for this instance. Every SELECT and write below runs within that lock.
  SELECT capacity INTO v_capacity
  FROM class_instances
  WHERE id = p_instance_id
    AND gym_id = p_gym_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Discover any cancelled booking for this user+instance now that we hold
  -- the lock. This replaces the pre-RPC SELECT in the route handler (K8) and
  -- means two concurrent re-booking requests cannot both observe the same
  -- cancelled row outside the lock.
  SELECT id INTO v_existing_id
  FROM bookings
  WHERE instance_id = p_instance_id
    AND user_id     = p_user_id
    AND gym_id      = p_gym_id
    AND status      = 'cancelled'
  LIMIT 1;

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
  IF v_existing_id IS NOT NULL THEN
    UPDATE bookings
    SET status                  = v_status,
        waitlist_position       = v_waitlist_position,
        cancelled_at            = NULL,
        confirmation_expires_at = NULL
    WHERE id      = v_existing_id
      AND user_id = p_user_id
      AND gym_id  = p_gym_id;
    v_booking_id := v_existing_id;
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

GRANT EXECUTE ON FUNCTION insert_booking_atomic(uuid, uuid, uuid, boolean, int) TO service_role;

-- Revoke and drop the old 6-argument signature (p_existing_id was the 6th
-- parameter). The route handler no longer passes it, so the old overload
-- must go to prevent stale callers from reaching the unpatched version.
REVOKE ALL ON FUNCTION insert_booking_atomic(uuid, uuid, uuid, boolean, int, uuid) FROM PUBLIC;
DROP FUNCTION IF EXISTS insert_booking_atomic(uuid, uuid, uuid, boolean, int, uuid);
