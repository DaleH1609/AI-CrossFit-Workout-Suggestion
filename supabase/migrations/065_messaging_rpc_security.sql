-- supabase/migrations/065_messaging_rpc_security.sql
--
-- Restrict the messaging unread counter RPCs to service-role only.
-- These functions are SECURITY DEFINER and intended to be called exclusively
-- from server-side API routes via the admin client. Revoking EXECUTE from
-- the authenticated role prevents users from calling them directly to
-- manipulate unread counts for conversations they don't own.

REVOKE EXECUTE ON FUNCTION increment_owner_unread(uuid)  FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION increment_member_unread(uuid) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION reset_owner_unread(uuid)      FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION reset_member_unread(uuid)     FROM authenticated, anon;
