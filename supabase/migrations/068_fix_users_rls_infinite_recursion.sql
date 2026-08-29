-- Fix: infinite recursion in RLS on public.users — login was broken for everyone.
--
-- Symptom
-- -------
-- Any authenticated read of public.users returned:
--   42P17: infinite recursion detected in policy for relation "users"
-- which meant every sign-in bounced straight back to /login:
--   /          -> 307 /dashboard   (proxy.ts swallows the query error and falls
--                                   back to /dashboard when role is unknown)
--   /dashboard -> 307 /login       (requireOwnerServerAuth sees userError)
--   /this-week -> 307 /login
--
-- Cause
-- -----
-- current_gym_id() and user_role() both `select ... from users where id =
-- auth.uid()`, and both were SECURITY INVOKER. The policies ON users call
-- them, so evaluating a policy read users, which re-evaluated the policies,
-- which called the functions again — unbounded.
--
-- The "coaches read gym members" policy had the same shape inline: an
-- EXISTS (SELECT 1 FROM users me ...) subquery inside a policy on users.
--
-- Fix
-- ---
-- 1. Make both helpers SECURITY DEFINER so their internal read of users
--    bypasses RLS and terminates. This is the documented pattern for RLS
--    helper functions, and is safe here because each reads only the calling
--    user's own row (`where id = auth.uid()`) and returns a single scalar the
--    caller already knows about themselves. It cannot expose another user's
--    data.
-- 2. Pin search_path to '' and fully qualify every reference. A SECURITY
--    DEFINER function with a mutable search_path is a privilege-escalation
--    vector, and the Supabase linter flags it (0011_function_search_path_mutable).
-- 3. Rewrite the coach policy to use the now-safe helpers instead of its own
--    recursive subquery.
--
-- EXECUTE is deliberately left as-is: RLS policies are evaluated as the
-- querying role, so `authenticated` must retain EXECUTE or every policy that
-- calls these would error instead of simply matching no rows.

CREATE OR REPLACE FUNCTION public.current_gym_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $function$
  SELECT gym_id FROM public.users WHERE id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.user_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $function$
  SELECT role FROM public.users WHERE id = auth.uid()
$function$;

-- Same recursion, expressed inline. user_role()/current_gym_id() are now
-- SECURITY DEFINER, so this form terminates.
DROP POLICY IF EXISTS "coaches read gym members" ON public.users;
CREATE POLICY "coaches read gym members"
  ON public.users
  FOR SELECT
  USING (
    public.user_role() = 'coach'::text
    AND gym_id = public.current_gym_id()
  );
