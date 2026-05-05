-- 021_admin_audit_log_rls.sql
--
-- admin_audit_log was created in 018_admin.sql without RLS enabled.
-- By default Supabase grants SELECT/INSERT/UPDATE/DELETE to the
-- authenticated role on new tables, meaning any logged-in member could
-- read the full admin action history, insert forged entries, or wipe the
-- audit trail via the Supabase REST API.
--
-- Enabling RLS with no policies = deny-all for authenticated + anon.
-- The service-role client used by app/(admin)/gyms/[gymId]/actions.ts
-- bypasses RLS, so existing inserts continue to work unchanged.

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Belt-and-braces: explicitly revoke from roles that shouldn't touch this table.
REVOKE ALL ON admin_audit_log FROM authenticated, anon;
