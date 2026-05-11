-- N3: Narrow bookings member RLS
--
-- The original "member manages own bookings" FOR ALL policy let any authenticated
-- member PATCH arbitrary columns (attended, status, waitlist_position, etc.)
-- directly against the Supabase REST API, bypassing route-handler logic.
--
-- Fix: drop the FOR ALL policy and revoke INSERT/UPDATE/DELETE from authenticated.
-- All booking mutations now go through route handlers that use the service-role
-- (admin) client, which bypasses RLS entirely. The SELECT policies remain so
-- members and owners can still read bookings.

DROP POLICY IF EXISTS "member manages own bookings" ON bookings;

-- Revoke direct write access. RLS policies only restrict what you're GRANTed,
-- so revoking at the privilege level is the belt-and-braces defence.
REVOKE INSERT, UPDATE, DELETE ON bookings FROM authenticated;
