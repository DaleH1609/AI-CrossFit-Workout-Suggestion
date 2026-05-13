-- 063_booking_rpcs.sql
-- A2: Promote ad-hoc booking UPDATEs to named RPCs (improvement plan A2).
--
-- Each function encodes the auth scope, the valid status transition, and
-- returns enough data for the caller to trigger post-mutation side-effects
-- (waitlist promotion, email sends, push notifications) that cannot happen
-- inside Postgres.
--
-- Functions:
--   cancel_booking(p_booking_id, p_gym_id, p_user_id)
--       → { cancelled bool, instance_id uuid }
--   expire_pending_confirmation(p_booking_id)
--       → { cancelled bool, instance_id uuid }
--   confirm_pending_booking(p_booking_id, p_instance_id)
--       → { confirmed bool, cancelled bool, reason text }

-- ---------------------------------------------------------------------------
-- cancel_booking
-- ---------------------------------------------------------------------------
-- Used by: DELETE /api/bookings (member self-cancel).
--
-- Cancels a booking belonging to p_user_id within p_gym_id.
-- Only transitions: confirmed | waitlisted | pending_confirmation → cancelled.
-- Idempotent: if already cancelled, returns cancelled = false (no error).
--
-- Returns:
--   cancelled    true  — row was updated
--   instance_id  uuid  — always set if the booking exists; null otherwise.
--                        Caller uses this to trigger waitlist promotion.
CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id uuid,
  p_gym_id     uuid,
  p_user_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance_id uuid;
  v_rows        int;
BEGIN
  -- Capture instance_id before the UPDATE so the caller can trigger promotion
  -- regardless of whether the cancel is a no-op.
  SELECT instance_id
  INTO   v_instance_id
  FROM   bookings
  WHERE  id      = p_booking_id
    AND  gym_id  = p_gym_id
    AND  user_id = p_user_id;

  IF NOT FOUND THEN
    -- Booking doesn't belong to this user/gym.
    RETURN jsonb_build_object('cancelled', false, 'instance_id', null::uuid);
  END IF;

  UPDATE bookings
  SET    status                  = 'cancelled',
         cancelled_at            = now(),
         waitlist_position       = NULL,
         confirmation_expires_at = NULL
  WHERE  id      = p_booking_id
    AND  gym_id  = p_gym_id
    AND  user_id = p_user_id
    AND  status IN ('confirmed', 'waitlisted', 'pending_confirmation');

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN jsonb_build_object('cancelled', v_rows > 0, 'instance_id', v_instance_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- expire_pending_confirmation
-- ---------------------------------------------------------------------------
-- Used by: GET /api/cron/waitlist-expire
--          POST /api/bookings/confirm/[token]  (expired-token branch)
--
-- Cancels a booking ONLY if its current status is pending_confirmation.
-- The conditional UPDATE is idempotent: if another concurrent process already
-- handled this booking the row count is 0 and cancelled = false, preventing
-- double-promotion of the waitlist.
--
-- Returns:
--   cancelled    true  — row was updated
--   instance_id  uuid  — always set if the booking exists; null otherwise.
CREATE OR REPLACE FUNCTION expire_pending_confirmation(
  p_booking_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance_id uuid;
  v_rows        int;
BEGIN
  SELECT instance_id
  INTO   v_instance_id
  FROM   bookings
  WHERE  id = p_booking_id;

  UPDATE bookings
  SET    status                  = 'cancelled',
         cancelled_at            = now(),
         waitlist_position       = NULL,
         confirmation_expires_at = NULL
  WHERE  id     = p_booking_id
    AND  status = 'pending_confirmation';

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN jsonb_build_object('cancelled', v_rows > 0, 'instance_id', v_instance_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- confirm_pending_booking
-- ---------------------------------------------------------------------------
-- Used by: POST /api/bookings/confirm/[token]
--
-- Atomically re-checks class capacity and flips pending_confirmation →
-- confirmed.  Holds a FOR UPDATE lock on the class_instances row for the
-- duration of the transaction, eliminating the TOCTOU race that exists when
-- the capacity check and the UPDATE are separate round-trips (as is the case
-- in insert_booking_atomic for inserts).
--
-- Returns:
--   confirmed true,  cancelled false, reason null
--       — booking is now confirmed.
--   confirmed false, cancelled true,  reason 'class_full'
--       — class filled between waitlist promotion and now;
--         booking was cancelled; caller should promote next waitlist member.
--   confirmed false, cancelled false, reason 'class_full'
--       — class full but the booking was already in a non-pending state
--         (race: another confirm beat us); caller may still promote.
--   confirmed false, cancelled false, reason 'not_pending'
--       — booking was not in pending_confirmation; already handled or bad id.
CREATE OR REPLACE FUNCTION confirm_pending_booking(
  p_booking_id  uuid,
  p_instance_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity  int;
  v_confirmed int;
  v_rows      int;
BEGIN
  -- Lock the class_instances row for the duration of this transaction so that
  -- concurrent confirm calls cannot race past the capacity check.
  SELECT capacity
  INTO   v_capacity
  FROM   class_instances
  WHERE  id = p_instance_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('confirmed', false, 'cancelled', false, 'reason', 'not_pending');
  END IF;

  -- Count existing confirmed bookings (excluding this one, which is still pending).
  SELECT count(*)
  INTO   v_confirmed
  FROM   bookings
  WHERE  instance_id = p_instance_id
    AND  status      = 'confirmed';

  IF v_confirmed >= v_capacity THEN
    -- Class is full: cancel this pending booking so the slot can be re-offered.
    UPDATE bookings
    SET    status                  = 'cancelled',
           cancelled_at            = now(),
           confirmation_expires_at = NULL,
           waitlist_position       = NULL
    WHERE  id     = p_booking_id
      AND  status = 'pending_confirmation';

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN jsonb_build_object('confirmed', false, 'cancelled', v_rows > 0, 'reason', 'class_full');
  END IF;

  -- Class has room: confirm.
  UPDATE bookings
  SET    status                  = 'confirmed',
         confirmation_expires_at = NULL,
         waitlist_position       = NULL
  WHERE  id     = p_booking_id
    AND  status = 'pending_confirmation';

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('confirmed', false, 'cancelled', false, 'reason', 'not_pending');
  END IF;

  RETURN jsonb_build_object('confirmed', true, 'cancelled', false, 'reason', null::text);
END;
$$;
