-- Security hardening migration
-- 1. Remove ability for authenticated members to call save_workout_draft directly.
--    The function is SECURITY DEFINER (bypasses RLS) so granting it to authenticated
--    allows any member to overwrite any gym's workout data by calling the RPC directly.
REVOKE EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) FROM authenticated;

-- 2. Fix member profile RLS policy to prevent privilege escalation.
--    The previous policy allowed members to update any column on their own row,
--    including role (escalating to 'owner') and gym_id (switching gyms).
--    The new policy locks role, gym_id, and revoked_at to their current values.
DROP POLICY IF EXISTS "member updates own profile" ON users;

CREATE POLICY "member updates own profile" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM users WHERE id = auth.uid())
    AND gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
    AND revoked_at IS NOT DISTINCT FROM (SELECT revoked_at FROM users WHERE id = auth.uid())
  );
