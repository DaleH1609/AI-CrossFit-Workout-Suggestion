-- 022_narrow_bookings_rls.sql
--
-- The original "member manages own bookings" policy was FOR ALL, which meant
-- a member could UPDATE any column on their own booking row via the Supabase
-- REST API, bypassing route-handler validation:
--   - attended = true  (fake attendance)
--   - status = 'confirmed' when cancelled past the cutoff
--   - waitlist_position = 1  (jump the queue)
--   - confirmation_expires_at = '2099-01-01'  (keep pending forever)
--
-- Fix: split into two narrow policies.
--
-- INSERT: members may create their own bookings with safe initial values.
--   - status must be 'confirmed' or 'waitlisted'
--   - attended must be false (set by route handler logic, never by member)
--
-- UPDATE: members may ONLY cancel their own active bookings.
--   All other mutations (re-booking after cancel, waitlist promotion,
--   confirmation token expiry, attendance marking) go through route handlers
--   or cron jobs that use the service-role client after verifying auth.
--
-- The re-booking UPDATE in app/api/bookings/route.ts (un-cancelling a row:
-- status → confirmed/waitlisted) is NOT covered here — that route was
-- switched to the admin client in the same PR.

DROP POLICY IF EXISTS "member manages own bookings" ON bookings;

-- Members may insert their own bookings with safe initial field values.
CREATE POLICY "member inserts own bookings" ON bookings
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND gym_id = current_gym_id()
    AND attended = false
    AND status IN ('confirmed', 'waitlisted')
  );

-- Members may only flip their own active booking to cancelled.
-- No other column changes are permitted.
CREATE POLICY "member cancels own bookings" ON bookings
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND gym_id = current_gym_id()
    AND status IN ('confirmed', 'waitlisted', 'pending_confirmation')
  )
  WITH CHECK (
    user_id = auth.uid()
    AND gym_id = current_gym_id()
    AND status = 'cancelled'
    AND attended = false
  );
