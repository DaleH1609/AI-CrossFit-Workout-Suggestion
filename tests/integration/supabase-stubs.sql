-- supabase-stubs.sql
-- Creates minimal Supabase role + auth stubs so that the real migration files
-- can run against a plain Postgres testcontainer without modification.
--
-- Stubs created here:
--   Roles: authenticated, anon, service_role
--   Schema: auth
--   Functions: auth.uid(), auth.role()
--
-- auth.uid() reads the session-level GUC `test.current_user_id` so that
-- individual tests can switch identity via SET LOCAL without reconnecting.
-- auth.role() reads `test.current_role`; defaults to 'service_role'.

-- Roles ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END
$$;

-- Auth schema ----------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('test.current_user_id', true), ''),
    '00000000-0000-0000-0000-000000000000'
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('test.current_role', true), ''),
    'service_role'
  );
$$;
