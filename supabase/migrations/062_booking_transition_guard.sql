-- 062_booking_transition_guard.sql
-- Enforce valid booking status transitions at the DB layer (A1 from improvement plan).
-- Illegal transitions raise an exception regardless of which client or route
-- triggered the UPDATE — service-role admin client included.
--
-- Valid transitions (derived by auditing every booking UPDATE in the codebase):
--   confirmed           → cancelled          (member cancel, admin revoke)
--   waitlisted          → pending_confirmation (spot opens, waitlist.ts)
--   waitlisted          → cancelled          (member removes, admin revoke)
--   pending_confirmation → confirmed         (member clicks confirm link)
--   pending_confirmation → cancelled         (expired, class full, revoke)
--   cancelled           → confirmed          (re-book via insert_booking_atomic)
--   cancelled           → waitlisted         (re-book when full, insert_booking_atomic)
--
-- Same-status UPDATEs (e.g. updating `attended` or `cancelled_at` without
-- changing status) pass through without restriction.

CREATE OR REPLACE FUNCTION enforce_booking_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- No status change: allow unconditionally (e.g. attended / cancelled_at updates)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF
    (OLD.status = 'confirmed'            AND NEW.status = 'cancelled')            OR
    (OLD.status = 'waitlisted'           AND NEW.status = 'pending_confirmation') OR
    (OLD.status = 'waitlisted'           AND NEW.status = 'cancelled')            OR
    (OLD.status = 'pending_confirmation' AND NEW.status = 'confirmed')            OR
    (OLD.status = 'pending_confirmation' AND NEW.status = 'cancelled')            OR
    (OLD.status = 'cancelled'            AND NEW.status = 'confirmed')            OR
    (OLD.status = 'cancelled'            AND NEW.status = 'waitlisted')
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Invalid booking status transition: % → % (booking id=%)',
    OLD.status, NEW.status, OLD.id;
END;
$$;

-- Drop the trigger if it already exists so this migration is idempotent
DROP TRIGGER IF EXISTS bookings_transition_check ON bookings;

CREATE TRIGGER bookings_transition_check
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_transition();
