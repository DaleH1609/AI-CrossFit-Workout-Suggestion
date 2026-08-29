-- Captures schema drift. It does not introduce it.
--
-- `specialty_programs` already exists in the production database (project
-- ncpxagtwgaxgbuxmuvmu) but no migration creates it, and it is referenced
-- nowhere in the application code. It was created directly in the dashboard
-- SQL editor and then left behind.
--
-- Everything below was read back from the live database on 2026-08-29 —
-- columns from the PostgREST schema, RLS state from pg_class, policy
-- predicates from pg_policies. Nothing here is authored from scratch, so that
-- rebuilding from migrations reproduces what is actually live.
--
-- Note the policies target the PUBLIC role rather than `authenticated`, which
-- is this schema's existing convention. That is captured as-is deliberately:
-- a drift-capture migration should record reality, not quietly change
-- production behaviour. Tightening it is a separate, reviewable change.
--
-- If the table is confirmed unused, the follow-up is a separate migration that
-- drops it. Do not delete this file to achieve that.

CREATE TABLE IF NOT EXISTS public.specialty_programs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id     uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name       text,
  week_start date,
  days       jsonb,
  status     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.specialty_programs ENABLE ROW LEVEL SECURITY;

-- Depends on the current_gym_id() and user_role() helpers defined earlier in
-- the migration set and used by the rest of this schema.
DROP POLICY IF EXISTS "members read published programs" ON public.specialty_programs;
CREATE POLICY "members read published programs"
  ON public.specialty_programs
  FOR SELECT
  USING (status = 'published'::text AND gym_id = current_gym_id());

DROP POLICY IF EXISTS "owners manage own gym programs" ON public.specialty_programs;
CREATE POLICY "owners manage own gym programs"
  ON public.specialty_programs
  FOR ALL
  USING (user_role() = 'owner'::text AND gym_id = current_gym_id())
  WITH CHECK (user_role() = 'owner'::text AND gym_id = current_gym_id());
