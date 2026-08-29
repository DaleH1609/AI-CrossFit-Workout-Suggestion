-- Close the public RPC surface on SECURITY DEFINER functions.
--
-- Problem
-- -------
-- Postgres grants EXECUTE to PUBLIC on every new function. Because anon and
-- authenticated inherit from PUBLIC, and PostgREST exposes everything in the
-- `public` schema as an RPC endpoint, each SECURITY DEFINER function below was
-- reachable unauthenticated at POST /rest/v1/rpc/<name>. SECURITY DEFINER runs
-- as the definer, so RLS is not consulted — the policies protecting these
-- tables were being bypassed entirely.
--
-- Confirmed live on 2026-03-29 via pg_proc.proacl: every function below carried
-- `=X/postgres` (the PUBLIC grant), and five of them perform no auth check in
-- their own body:
--   cancel_booking, confirm_pending_booking, save_workout_draft,
--   increment_member_unread, reset_owner_unread
--
-- Why revoking is safe
-- --------------------
-- Every call site was audited. All eight functions are invoked exclusively
-- from server-side route handlers using the service-role client
-- (`createAdminClient()`), never from the browser:
--
--   cancel_booking              app/api/bookings/route.ts:163
--   insert_booking_atomic       app/api/bookings/route.ts:90
--   confirm_pending_booking     app/api/bookings/confirm/[token]/route.ts:188
--   expire_pending_confirmation app/api/bookings/confirm/[token]/route.ts:169
--                               app/api/cron/waitlist-expire/route.ts:67
--   save_workout_draft          app/api/workouts/create-manual/route.ts:38
--                               app/api/workouts/generate/route.ts:117
--   increment_member_unread     app/api/messages/route.ts:180
--   increment_owner_unread      app/api/messages/route.ts:136
--   reset_member_unread         app/api/messages/conversations/[id]/read/route.ts:45
--   reset_owner_unread          app/api/messages/conversations/[id]/read/route.ts:54
--
-- service_role is unaffected by these REVOKEs and is re-granted explicitly
-- below, so application behaviour does not change. What changes is that a
-- direct unauthenticated POST to these RPC endpoints now fails.
--
-- This is defence in depth, not a substitute for auth checks in the function
-- bodies. Adding those is worthwhile follow-up, but revoking the grant removes
-- the exposure without altering any function logic.

DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.cancel_booking(uuid, uuid, uuid)',
    'public.confirm_pending_booking(uuid, uuid)',
    'public.expire_pending_confirmation(uuid)',
    'public.insert_booking_atomic(uuid, uuid, uuid, boolean, integer)',
    'public.increment_member_unread(uuid)',
    'public.increment_owner_unread(uuid)',
    'public.reset_member_unread(uuid)',
    'public.reset_owner_unread(uuid)',
    -- both overloads
    'public.save_workout_draft(uuid, date, jsonb)',
    'public.save_workout_draft(uuid, date, jsonb, jsonb)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    -- to_regprocedure returns NULL rather than raising if the signature is not
    -- found, so a drifted signature skips instead of failing the migration.
    IF to_regprocedure(fn) IS NULL THEN
      RAISE NOTICE 'skipping %, not found', fn;
      CONTINUE;
    END IF;

    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END
$$;
