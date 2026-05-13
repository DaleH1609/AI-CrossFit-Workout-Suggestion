-- 059_booking_transition_trigger.sql
--
-- A1: Enforce the booking status state machine at the database level.
--
-- Allowed transitions (derived from full codebase audit):
--
--   confirmed          → cancelled           (member/system cancel)
--   waitlisted         → pending_confirmation (waitlist promotion)
--   waitlisted         → cancelled           (member cancels while waitlisted)
--   pending_confirmation → confirmed          (member confirms via email link)
--   pending_confirmation → cancelled          (token expired, class filled, cron expire)
--   cancelled          → confirmed           (re-booking via insert_booking_atomic)
--   cancelled          → waitlisted          (re-booking when class full)
--
-- Every other transition is invalid and will raise an exception, rolling back
-- the containing transaction.
--
-- Scoped to UPDATE OF status to avoid overhead on unrelated column updates
-- (attended, cancelled_at, confirmation_expires_at, etc.).

CREATE OR REPLACE FUNCTION bookings_enforce_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Allow no-op updates (status unchanged)
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Validate the transition
  IF (OLD.status = 'confirmed'             AND NEW.status = 'cancelled')            OR
     (OLD.status = 'waitlisted'            AND NEW.status = 'pending_confirmation') OR
     (OLD.status = 'waitlisted'            AND NEW.status = 'cancelled')            OR
     (OLD.status = 'pending_confirmation'  AND NEW.status = 'confirmed')            OR
     (OLD.status = 'pending_confirmation'  AND NEW.status = 'cancelled')            OR
     (OLD.status = 'cancelled'             AND NEW.status = 'confirmed')            OR
     (OLD.status = 'cancelled'             AND NEW.status = 'waitlisted')
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'bookings: invalid status transition % → %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER bookings_status_transition
BEFORE UPDATE OF status ON bookings
FOR EACH ROW
EXECUTE FUNCTION bookings_enforce_status_transition();
