-- migration 052: booking state machine enforcement (A1)
-- Prevents invalid status transitions at the database layer.
-- Valid transitions:
--   waitlisted       → pending_confirmation, cancelled
--   pending_confirmation → confirmed, cancelled, waitlisted (re-waitlisted if expired)
--   confirmed        → cancelled, waitlisted (admin rebook)
--   cancelled        → confirmed, waitlisted (re-confirmation or re-join)
-- Any other transition raises an exception, preventing rogue UPDATEs from any
-- client (route handler, admin dashboard, or misconfigured RLS bypass).

CREATE OR REPLACE FUNCTION enforce_booking_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Only enforce when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define allowed next states for each current state
  CASE OLD.status
    WHEN 'waitlisted' THEN
      IF NEW.status NOT IN ('pending_confirmation', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid booking transition: % → %', OLD.status, NEW.status;
      END IF;
    WHEN 'pending_confirmation' THEN
      IF NEW.status NOT IN ('confirmed', 'cancelled', 'waitlisted') THEN
        RAISE EXCEPTION 'Invalid booking transition: % → %', OLD.status, NEW.status;
      END IF;
    WHEN 'confirmed' THEN
      IF NEW.status NOT IN ('cancelled', 'waitlisted') THEN
        RAISE EXCEPTION 'Invalid booking transition: % → %', OLD.status, NEW.status;
      END IF;
    WHEN 'cancelled' THEN
      IF NEW.status NOT IN ('confirmed', 'waitlisted', 'pending_confirmation') THEN
        RAISE EXCEPTION 'Invalid booking transition: % → %', OLD.status, NEW.status;
      END IF;
    ELSE
      -- Unknown current status — block
      RAISE EXCEPTION 'Unknown booking status: %', OLD.status;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_transition_check
  BEFORE UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_transition();
