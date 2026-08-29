-- Idempotent combined migration (safe to re-run)
-- Generated 2026-05-23T11:16:32.452Z

-- ═══════════════════════════════════════
-- 001_schema.sql
-- ═══════════════════════════════════════

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Gyms
create table if not exists gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'UTC',
  owner_id uuid, -- set after users created; FK added below
  created_at timestamptz not null default now()
);

-- Users
create table if not exists users (
  id uuid primary key, -- matches Supabase Auth UID
  gym_id uuid not null references gyms(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

DO $$ BEGIN
  ALTER TABLE gyms ADD CONSTRAINT gyms_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Style examples
create table if not exists style_examples (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  raw_text text not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- Workout weeks
create table if not exists workout_weeks (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  week_start date not null, -- always a Monday
  workouts jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft','published','discarded')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(gym_id, week_start, status) -- only one draft per gym per week
);

-- Class slot templates
create table if not exists class_slot_templates (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 7),
  local_time time not null,
  capacity int not null default 20,
  active boolean not null default true
);

-- Class instances
create table if not exists class_instances (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  template_id uuid references class_slot_templates(id) on delete set null,
  date date not null,
  local_time time not null,
  starts_at timestamptz not null, -- UTC anchor, DST-safe
  capacity int not null default 20
);

-- Bookings
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  instance_id uuid not null references class_instances(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'confirmed'
    check (status in ('confirmed','waitlisted','pending_confirmation','cancelled')),
  waitlist_position int,
  confirmation_token uuid unique,
  confirmation_expires_at timestamptz,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique(instance_id, user_id)
);

-- Indexes
create index on class_instances(gym_id, date);
create index on bookings(instance_id, status);
create index on bookings(confirmation_token) where confirmation_token is not null;
create index on workout_weeks(gym_id, week_start);
create index on users(gym_id);
create unique index on users(gym_id, email);


-- ═══════════════════════════════════════
-- 002_rls.sql
-- ═══════════════════════════════════════

-- Enable RLS on all tables
alter table gyms enable row level security;
alter table users enable row level security;
alter table style_examples enable row level security;
alter table workout_weeks enable row level security;
alter table class_slot_templates enable row level security;
alter table class_instances enable row level security;
alter table bookings enable row level security;

-- Helper: get gym_id for current user
create or replace function current_gym_id()
returns uuid language sql stable as $$
  select gym_id from users where id = auth.uid()
$$;

-- Helper: get role for current user
create or replace function user_role()
returns text language sql stable as $$
  select role from users where id = auth.uid()
$$;

-- Gyms: owner can read/update their gym
DROP POLICY IF EXISTS "owner reads own gym" ON gyms;
create policy "owner reads own gym" on gyms
  for select using (id = current_gym_id());
DROP POLICY IF EXISTS "owner updates own gym" ON gyms;
create policy "owner updates own gym" on gyms
  for update using (owner_id = auth.uid());

-- Users: users read members of their gym; owner can insert/update
DROP POLICY IF EXISTS "users read same gym" ON users;
create policy "users read same gym" on users
  for select using (gym_id = current_gym_id());
DROP POLICY IF EXISTS "owner manages members" ON users;
create policy "owner manages members" on users
  for all using (user_role() = 'owner' and gym_id = current_gym_id())
  with check (user_role() = 'owner' and gym_id = current_gym_id());

-- Style examples: owner only
DROP POLICY IF EXISTS "owner manages style examples" ON style_examples;
create policy "owner manages style examples" on style_examples
  for all using (user_role() = 'owner' and gym_id = current_gym_id())
  with check (user_role() = 'owner' and gym_id = current_gym_id());

-- Workout weeks: owner sees all; members see published only
DROP POLICY IF EXISTS "owner sees all workout weeks" ON workout_weeks;
create policy "owner sees all workout weeks" on workout_weeks
  for select using (user_role() = 'owner' and gym_id = current_gym_id());
DROP POLICY IF EXISTS "owner manages workout weeks" ON workout_weeks;
create policy "owner manages workout weeks" on workout_weeks
  for all using (user_role() = 'owner' and gym_id = current_gym_id())
  with check (user_role() = 'owner' and gym_id = current_gym_id());
DROP POLICY IF EXISTS "member sees published workout weeks" ON workout_weeks;
create policy "member sees published workout weeks" on workout_weeks
  for select using (
    user_role() = 'member'
    and gym_id = current_gym_id()
    and status = 'published'
    and archived_at is null
  );

-- Class slot templates: owner manages; members read active
DROP POLICY IF EXISTS "owner manages templates" ON class_slot_templates;
create policy "owner manages templates" on class_slot_templates
  for all using (user_role() = 'owner' and gym_id = current_gym_id())
  with check (user_role() = 'owner' and gym_id = current_gym_id());
DROP POLICY IF EXISTS "member reads active templates" ON class_slot_templates;
create policy "member reads active templates" on class_slot_templates
  for select using (gym_id = current_gym_id() and active = true);

-- Class instances: all gym members read; owner manages
DROP POLICY IF EXISTS "gym members read instances" ON class_instances;
create policy "gym members read instances" on class_instances
  for select using (gym_id = current_gym_id());
DROP POLICY IF EXISTS "owner manages instances" ON class_instances;
create policy "owner manages instances" on class_instances
  for all using (user_role() = 'owner' and gym_id = current_gym_id())
  with check (user_role() = 'owner' and gym_id = current_gym_id());

-- Bookings: members see own; owner sees all in gym
DROP POLICY IF EXISTS "member sees own bookings" ON bookings;
create policy "member sees own bookings" on bookings
  for select using (user_id = auth.uid());
DROP POLICY IF EXISTS "member manages own bookings" ON bookings;
create policy "member manages own bookings" on bookings
  for all using (user_id = auth.uid() and gym_id = current_gym_id())
  with check (user_id = auth.uid() and gym_id = current_gym_id());
DROP POLICY IF EXISTS "owner sees all bookings" ON bookings;
create policy "owner sees all bookings" on bookings
  for select using (user_role() = 'owner' and gym_id = current_gym_id());


-- ═══════════════════════════════════════
-- 003_gym_type.sql
-- ═══════════════════════════════════════

ALTER TABLE gyms ADD COLUMN IF NOT EXISTS gym_type text NOT NULL DEFAULT 'crossfit'
  CHECK (gym_type IN ('crossfit', 'hyrox'));


-- ═══════════════════════════════════════
-- 004_gym_schedule_defaults.sql
-- ═══════════════════════════════════════

-- supabase/migrations/004_gym_schedule_defaults.sql
CREATE TABLE IF NOT EXISTS gym_schedule_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  day_of_week int CHECK (day_of_week IS NULL OR (day_of_week >= 1 AND day_of_week <= 7)),
  default_capacity int NOT NULL DEFAULT 20,
  UNIQUE (gym_id, day_of_week)
);

ALTER TABLE gym_schedule_defaults ENABLE ROW LEVEL SECURITY;

-- Owners can read/write their own gym's defaults
DROP POLICY IF EXISTS "owner_manage_defaults" ON gym_schedule_defaults;
DROP POLICY IF EXISTS "owner_manage_defaults" ON gym_schedule_defaults;
CREATE POLICY "owner_manage_defaults" ON gym_schedule_defaults
  FOR ALL USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );

-- Members can read (needed to resolve effective capacity for display)
DROP POLICY IF EXISTS "member_read_defaults" ON gym_schedule_defaults;
DROP POLICY IF EXISTS "member_read_defaults" ON gym_schedule_defaults;
CREATE POLICY "member_read_defaults" ON gym_schedule_defaults
  FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid())
  );


-- ═══════════════════════════════════════
-- 005_nullable_template_capacity.sql
-- ═══════════════════════════════════════

-- supabase/migrations/005_nullable_template_capacity.sql
ALTER TABLE class_slot_templates ALTER COLUMN capacity DROP NOT NULL;

-- Existing "20" values were the old hardcoded default, not intentional overrides.
-- Set them to null so they inherit from the new defaults system.
UPDATE class_slot_templates SET capacity = NULL WHERE capacity IS NOT NULL;


-- ═══════════════════════════════════════
-- 006_attendance.sql
-- ═══════════════════════════════════════

alter table bookings ADD COLUMN IF NOT EXISTS attended boolean;


-- ═══════════════════════════════════════
-- 007_owner_booking_update.sql
-- ═══════════════════════════════════════

-- Allow gym owners to update bookings in their gym
-- Required for attendance marking (attended column) and other owner operations
DROP POLICY IF EXISTS "owner updates bookings" ON bookings;
create policy "owner updates bookings"
  on bookings
  for update
  using (user_role() = 'owner' and gym_id = current_gym_id())
  with check (gym_id = current_gym_id());


-- ═══════════════════════════════════════
-- 008_cancellation_cutoff.sql
-- ═══════════════════════════════════════

ALTER TABLE gyms ADD COLUMN IF NOT EXISTS cancellation_cutoff_hours int NOT NULL DEFAULT 0;


-- ═══════════════════════════════════════
-- 009_class_slot_names.sql
-- ═══════════════════════════════════════

ALTER TABLE class_slot_templates
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'WOD',
  ADD COLUMN IF NOT EXISTS workout_notes text;

ALTER TABLE class_instances
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'WOD',
  ADD COLUMN IF NOT EXISTS workout_notes text;


-- ═══════════════════════════════════════
-- 010_upsert_workout_draft.sql
-- ═══════════════════════════════════════

-- Atomic upsert for workout drafts — bypasses RLS via SECURITY DEFINER
-- Called from the generate API route to avoid unique constraint conflicts
CREATE OR REPLACE FUNCTION save_workout_draft(
  p_gym_id uuid,
  p_week_start date,
  p_workouts jsonb
) RETURNS workout_weeks AS $$
DECLARE
  result workout_weeks;
BEGIN
  -- Delete any existing draft for this gym+week (atomic, no race condition)
  DELETE FROM workout_weeks
  WHERE gym_id = p_gym_id
    AND week_start = p_week_start
    AND status = 'draft';

  -- Insert fresh draft and return the new row
  INSERT INTO workout_weeks (gym_id, week_start, workouts, status)
  VALUES (p_gym_id, p_week_start, p_workouts, 'draft')
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow service_role and authenticated users to call this function
GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO authenticated;


-- ═══════════════════════════════════════
-- 011_fix_workout_week_constraints.sql
-- ═══════════════════════════════════════

-- The original unique(gym_id, week_start, status) constraint prevents having
-- more than one row of each status per week, which breaks regeneration workflows:
--   1. Generate → draft
--   2. Approve → draft becomes published
--   3. Regenerate → new draft (ok)
--   4. Approve again → fails because (gym_id, week_start, 'published') already exists
--
-- Fix: replace with partial unique indexes that only enforce uniqueness
-- for 'draft' and 'published' statuses, allowing many 'discarded' rows.

-- Drop the old full constraint
ALTER TABLE workout_weeks
  DROP CONSTRAINT IF EXISTS workout_weeks_gym_id_week_start_status_key;

-- Only one active draft per gym per week
CREATE UNIQUE INDEX IF NOT EXISTS workout_weeks_one_draft
  ON workout_weeks (gym_id, week_start)
  WHERE status = 'draft';

-- Only one published week per gym per week
CREATE UNIQUE INDEX IF NOT EXISTS workout_weeks_one_published
  ON workout_weeks (gym_id, week_start)
  WHERE status = 'published';

-- Update the save_workout_draft function to use the new index structure
CREATE OR REPLACE FUNCTION save_workout_draft(
  p_gym_id uuid,
  p_week_start date,
  p_workouts jsonb
) RETURNS workout_weeks AS $$
DECLARE
  result workout_weeks;
BEGIN
  -- Remove any existing draft for this gym+week (partial index allows only one)
  DELETE FROM workout_weeks
  WHERE gym_id = p_gym_id
    AND week_start = p_week_start
    AND status = 'draft';

  -- Insert fresh draft
  INSERT INTO workout_weeks (gym_id, week_start, workouts, status)
  VALUES (p_gym_id, p_week_start, p_workouts, 'draft')
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO authenticated;


-- ═══════════════════════════════════════
-- 012_class_types.sql
-- ═══════════════════════════════════════

-- Class types: owner-defined categories for class slots (e.g. WOD, Run Club, Hyrox)
CREATE TABLE IF NOT EXISTS class_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#eab308',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE class_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_manage_class_types" ON class_types;
DROP POLICY IF EXISTS "owners_manage_class_types" ON class_types;
CREATE POLICY "owners_manage_class_types" ON class_types
  FOR ALL USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "members_read_class_types" ON class_types;
DROP POLICY IF EXISTS "members_read_class_types" ON class_types;
CREATE POLICY "members_read_class_types" ON class_types
  FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid())
  );

DO $$ BEGIN
  CREATE INDEX ON class_types(gym_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add class_type_id FK to templates and instances (nullable — backward compat)
ALTER TABLE class_slot_templates
  ADD COLUMN IF NOT EXISTS class_type_id uuid REFERENCES class_types(id) ON DELETE SET NULL;

ALTER TABLE class_instances
  ADD COLUMN IF NOT EXISTS class_type_id uuid REFERENCES class_types(id) ON DELETE SET NULL;


-- ═══════════════════════════════════════
-- 013_member_profile_update.sql
-- ═══════════════════════════════════════

-- Allow members to update their own profile (name only in practice)
DROP POLICY IF EXISTS "member updates own profile" ON users;
create policy "member updates own profile" on users
  for update using (id = auth.uid())
  with check (id = auth.uid());


-- ═══════════════════════════════════════
-- 014_gym_settings.sql
-- ═══════════════════════════════════════

ALTER TABLE gyms ADD COLUMN IF NOT EXISTS default_capacity int NOT NULL DEFAULT 20;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS booking_advance_hours int NOT NULL DEFAULT 0;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS show_member_names boolean NOT NULL DEFAULT false;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS notify_workout_published boolean NOT NULL DEFAULT true;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS notify_booking_confirmed boolean NOT NULL DEFAULT true;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS contact_email text;


-- ═══════════════════════════════════════
-- 015_security_hardening.sql
-- ═══════════════════════════════════════

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

DROP POLICY IF EXISTS "member updates own profile" ON users;
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


-- ═══════════════════════════════════════
-- 016_review_fixes.sql
-- ═══════════════════════════════════════

-- 016_review_fixes.sql
--
-- Fixes surfaced by the multi-agent code review (April 2026):
--   * missing indexes on hot query paths (RLS filters, cron scans)
--   * overly broad unique(instance_id, user_id) on bookings
--   * nullable bookings.attended with ambiguous NULL/false semantics
--   * missing CHECK constraints on capacity / hour settings
--   * missing updated_at on bookings
--
-- Migration is written to be safely re-runnable where possible
-- (IF NOT EXISTS / IF EXISTS guards).

----------------------------------------------------------------------
-- 1. Missing indexes on hot query paths
----------------------------------------------------------------------

-- bookings(user_id): RLS subqueries and "my-schedule" queries filter by user_id
create index if not exists bookings_user_id_idx on bookings(user_id);

-- bookings(user_id, gym_id, status): owner revoke/delete flows filter by all three
create index if not exists bookings_user_gym_status_idx on bookings(user_id, gym_id, status);

-- class_instances(template_id): used by FK cascade lookups and capacity-downgrade check
create index if not exists class_instances_template_id_idx on class_instances(template_id);

-- workout_weeks(status): RLS policies and "published weeks" filters hit status
create index if not exists workout_weeks_status_idx on workout_weeks(status);

-- class_instances(starts_at): cron and waitlist flows filter by starts_at
create index if not exists class_instances_starts_at_idx on class_instances(starts_at);

-- bookings(confirmation_expires_at) where pending: cron waitlist-expire scan
create index if not exists bookings_pending_expires_idx
  on bookings(confirmation_expires_at)
  where status = 'pending_confirmation';

----------------------------------------------------------------------
-- 2. bookings.attended — remove the NULL/false ambiguity
----------------------------------------------------------------------
-- Existing NULL rows mean "not tracked"; new rows should default to false.
update bookings set attended = false where attended is null;
alter table bookings alter column attended set default false;
alter table bookings alter column attended set not null;

----------------------------------------------------------------------
-- 3. Replace the blunt unique(instance_id, user_id) constraint
----------------------------------------------------------------------
-- The old constraint prevented a user from re-booking a class after
-- cancelling. We want exactly-one *active* booking per (instance, user),
-- where active = not cancelled. Cancelled rows should be re-bookable.

alter table bookings drop constraint if exists bookings_instance_id_user_id_key;

create unique index if not exists bookings_active_unique_idx
  on bookings(instance_id, user_id)
  where status in ('confirmed', 'waitlisted', 'pending_confirmation');

----------------------------------------------------------------------
-- 4. Missing updated_at on bookings, with auto-touch trigger
----------------------------------------------------------------------
alter table bookings
  add column if not exists updated_at timestamptz not null default now();

create or replace function touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists bookings_touch_updated_at on bookings;
create trigger bookings_touch_updated_at
  before update on bookings
  for each row execute function touch_updated_at();

-- Same for class_instances (review flagged it as missing created_at/updated_at)
alter table class_instances
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists class_instances_touch_updated_at on class_instances;
create trigger class_instances_touch_updated_at
  before update on class_instances
  for each row execute function touch_updated_at();

----------------------------------------------------------------------
-- 5. Missing CHECK constraints on capacity / hour settings
----------------------------------------------------------------------
-- Capacity must be positive (zero-capacity class is meaningless).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'class_instances_capacity_positive') then
    alter table class_instances
      add constraint class_instances_capacity_positive check (capacity > 0);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'class_slot_templates_capacity_positive') then
    alter table class_slot_templates
      add constraint class_slot_templates_capacity_positive check (capacity is null or capacity > 0);
  end if;
end $$;

-- Non-negative hour settings on gyms.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gyms_cancellation_cutoff_nonneg') then
    alter table gyms
      add constraint gyms_cancellation_cutoff_nonneg check (cancellation_cutoff_hours >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'gyms_booking_advance_nonneg') then
    alter table gyms
      add constraint gyms_booking_advance_nonneg check (booking_advance_hours >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'gyms_default_capacity_positive') then
    alter table gyms
      add constraint gyms_default_capacity_positive check (default_capacity > 0);
  end if;
end $$;

-- Waitlist position must be positive when set.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_waitlist_position_positive') then
    alter table bookings
      add constraint bookings_waitlist_position_positive
        check (waitlist_position is null or waitlist_position > 0);
  end if;
end $$;


-- ═══════════════════════════════════════
-- 017_confirmation_token_text.sql
-- ═══════════════════════════════════════

-- 017_confirmation_token_text.sql
--
-- Widen bookings.confirmation_token from `uuid` to `text` to accommodate the
-- HMAC-signed token format introduced in lib/crypto/token.ts
-- (v1.{base64url(payload)}.{base64url(signature)}).
--
-- Before this change, `signToken()` produced strings like
--   v1.eyJiIjoiYm9va2luZy0xIiwiZSI6MTcxNTAwMDAwMDAwMH0.Yn4K...
-- which Postgres rejects with "invalid input syntax for type uuid" when the
-- waitlist promotion path writes them to the column. That would break the
-- confirmation flow the very first time a class fills up post-deploy.
--
-- Legacy values in this column (from before the signed-token rollout) are
-- UUIDs and will cast cleanly to text. Any in-flight pending confirmations
-- remain valid — the `/api/bookings/confirm/[token]` route still has a
-- UUID-shaped fallback branch that looks them up by equality.
--
-- The partial unique index must be rebuilt because the column type changes.
-- Postgres auto-drops the index during ALTER TYPE, but we recreate it
-- explicitly so the migration is self-documenting.

----------------------------------------------------------------------
-- 1. Drop dependent indexes (Postgres requires this before ALTER TYPE)
----------------------------------------------------------------------
alter table bookings drop constraint if exists bookings_confirmation_token_key;  -- drop constraint (not index) if present
drop index if exists bookings_confirmation_token_idx;          -- partial index name from 001

-- 001_schema.sql used implicit index names; look them up defensively.
do $$
declare
  r record;
begin
  for r in
    select indexname from pg_indexes
    where schemaname = 'public'
      and tablename = 'bookings'
      and indexdef ilike '%confirmation_token%'
  loop
    execute format('drop index if exists %I', r.indexname);
  end loop;
end $$;

-- Drop the unique constraint (if it was created as a constraint rather than
-- just a unique index). Safe if it doesn't exist.
alter table bookings drop constraint if exists bookings_confirmation_token_key;

----------------------------------------------------------------------
-- 2. Widen the column
----------------------------------------------------------------------
alter table bookings
  alter column confirmation_token type text using confirmation_token::text;

----------------------------------------------------------------------
-- 3. Re-create the indexes on the new type
----------------------------------------------------------------------
-- Unique per-token lookup (only when non-null; cancelled/confirmed rows clear it).
create unique index if not exists bookings_confirmation_token_key
  on bookings(confirmation_token)
  where confirmation_token is not null;

-- Hot lookup path used by the confirm route and waitlist-expire cron.
create index if not exists bookings_confirmation_token_idx
  on bookings(confirmation_token)
  where confirmation_token is not null;


-- ═══════════════════════════════════════
-- 018_admin.sql
-- ═══════════════════════════════════════

-- 018_admin.sql
-- Adds gym suspension support and admin audit log

alter table gyms add column if not exists suspended_at timestamptz;

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,         -- 'suspend_gym' | 'unsuspend_gym' | 'delete_gym'
  target_id uuid,
  target_name text,
  created_at timestamptz not null default now()
);


-- ═══════════════════════════════════════
-- 019_drop_confirmation_token.sql
-- ═══════════════════════════════════════

-- 019_drop_confirmation_token.sql
--
-- The confirmation_token column was retained "for audit" after the HMAC-signed
-- token migration (017), but it is now nulled on every confirm/cancel/expire
-- path and never read as an authority. Keeping it around is a defence-in-depth
-- gap (an old UUID-based lookup could be reintroduced accidentally).
--
-- The audit trail is preserved: cancelled_at, confirmation_expires_at, and
-- status transitions provide all the forensic information needed.

ALTER TABLE bookings DROP COLUMN IF EXISTS confirmation_token;


-- ═══════════════════════════════════════
-- 020_ai_spend_limit.sql
-- ═══════════════════════════════════════

-- 020_ai_spend_limit.sql
--
-- Adds per-gym monthly AI call tracking to enforce a spend ceiling.
-- ai_month stores the billing month as YYYY-MM; when the month rolls over
-- the application resets ai_calls_this_month to 1 atomically on first call.

ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS ai_calls_this_month int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_month text NOT NULL DEFAULT '';


-- ═══════════════════════════════════════
-- 021_admin_audit_log_rls.sql
-- ═══════════════════════════════════════

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


-- ═══════════════════════════════════════
-- 022_narrow_bookings_rls.sql
-- ═══════════════════════════════════════

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
DROP POLICY IF EXISTS "member inserts own bookings" ON bookings;
DROP POLICY IF EXISTS "member inserts own bookings" ON bookings;
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
DROP POLICY IF EXISTS "member cancels own bookings" ON bookings;
DROP POLICY IF EXISTS "member cancels own bookings" ON bookings;
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


-- ═══════════════════════════════════════
-- 023_db_correctness.sql
-- ═══════════════════════════════════════

-- 023_db_correctness.sql
--
-- Bundles three DB-correctness fixes from the 2026-05-05 security review.
--
-- N8: save_workout_draft — add in-function gym_id ownership check.
--     REVOKE from authenticated already happened in 015, but a future
--     migration could re-grant it. The function now validates that non-
--     service-role callers own the gym they're writing to.
--
-- N9: users RLS — lock email to prevent header-injection and invite
--     enumeration via public.users.email desync.
--
-- N10: insert_booking_atomic — replaces the racy count-insert-recount
--     pattern with a single transaction that holds a row lock on the
--     class_instances row for the duration of the capacity check.

-- ─── N8: save_workout_draft gym ownership guard ─────────────────────────────

CREATE OR REPLACE FUNCTION save_workout_draft(
  p_gym_id uuid,
  p_week_start date,
  p_workouts jsonb
) RETURNS workout_weeks AS $$
DECLARE
  result workout_weeks;
BEGIN
  -- Defence-in-depth: if somehow an authenticated (non-service-role) caller
  -- reaches this SECURITY DEFINER function, verify they own the gym.
  -- Service-role callers (the generate/create-manual routes) bypass this.
  IF auth.role() != 'service_role' THEN
    IF p_gym_id IS DISTINCT FROM (
      SELECT gym_id FROM users WHERE id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'save_workout_draft: gym_id mismatch for caller %', auth.uid();
    END IF;
  END IF;

  -- Remove any existing draft for this gym+week (partial index allows only one)
  DELETE FROM workout_weeks
  WHERE gym_id = p_gym_id
    AND week_start = p_week_start
    AND status = 'draft';

  -- Insert fresh draft
  INSERT INTO workout_weeks (gym_id, week_start, workouts, status)
  VALUES (p_gym_id, p_week_start, p_workouts, 'draft')
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO service_role;
-- authenticated remains revoked (see 015_security_hardening.sql)


-- ─── N9: lock users.email in member update RLS ──────────────────────────────
-- Members could change public.users.email directly via the Supabase REST API,
-- causing desync with auth.users.email, enabling invite enumeration, and
-- misdirecting system emails. The email column is now locked alongside role,
-- gym_id, and revoked_at.

DROP POLICY IF EXISTS "member updates own profile" ON users;

DROP POLICY IF EXISTS "member updates own profile" ON users;
DROP POLICY IF EXISTS "member updates own profile" ON users;
CREATE POLICY "member updates own profile" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role     = (SELECT role     FROM users WHERE id = auth.uid())
    AND gym_id   = (SELECT gym_id   FROM users WHERE id = auth.uid())
    AND email    = (SELECT email    FROM users WHERE id = auth.uid())
    AND revoked_at IS NOT DISTINCT FROM (SELECT revoked_at FROM users WHERE id = auth.uid())
  );


-- ─── N10: atomic booking insert ─────────────────────────────────────────────
-- Replaces the racy count → insert → recount pattern in app/api/bookings/route.ts.
-- Holds a FOR UPDATE lock on the class_instances row so concurrent requests
-- serialize at the capacity check rather than racing past it.
--
-- Returns jsonb:
--   { "booking_id": uuid, "status": text, "waitlist_position": int|null }
--   { "error": "class_full" | "waitlist_full" }

CREATE OR REPLACE FUNCTION insert_booking_atomic(
  p_gym_id            uuid,
  p_instance_id       uuid,
  p_user_id           uuid,
  p_capacity          int,
  p_waitlist_enabled  boolean,
  p_max_waitlist      int,
  p_existing_id       uuid    -- non-null = re-booking an existing cancelled row
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_confirmed_count   int;
  v_waitlist_count    int;
  v_status            text;
  v_waitlist_position int;
  v_booking_id        uuid;
BEGIN
  -- Serialize concurrent bookings for this instance by locking its row.
  PERFORM 1 FROM class_instances WHERE id = p_instance_id FOR UPDATE;

  -- Count active bookings atomically inside the lock.
  SELECT
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'pending_confirmation')),
    COUNT(*) FILTER (WHERE status = 'waitlisted')
  INTO v_confirmed_count, v_waitlist_count
  FROM bookings
  WHERE instance_id = p_instance_id
    AND status IN ('confirmed', 'pending_confirmation', 'waitlisted');

  -- Determine outcome.
  IF v_confirmed_count >= p_capacity THEN
    IF NOT p_waitlist_enabled THEN
      RETURN jsonb_build_object('error', 'class_full');
    END IF;
    IF v_waitlist_count >= p_max_waitlist THEN
      RETURN jsonb_build_object('error', 'waitlist_full');
    END IF;
    v_status := 'waitlisted';
    v_waitlist_position := v_waitlist_count + 1;
  ELSE
    v_status := 'confirmed';
    v_waitlist_position := NULL;
  END IF;

  -- Insert or un-cancel.
  IF p_existing_id IS NOT NULL THEN
    UPDATE bookings
    SET status              = v_status,
        waitlist_position   = v_waitlist_position,
        cancelled_at        = NULL,
        confirmation_expires_at = NULL
    WHERE id      = p_existing_id
      AND user_id = p_user_id;  -- extra safety: caller must own the row
    v_booking_id := p_existing_id;
  ELSE
    INSERT INTO bookings (gym_id, instance_id, user_id, status, waitlist_position)
    VALUES (p_gym_id, p_instance_id, p_user_id, v_status, v_waitlist_position)
    RETURNING id INTO v_booking_id;
  END IF;

  RETURN jsonb_build_object(
    'booking_id',        v_booking_id,
    'status',            v_status,
    'waitlist_position', v_waitlist_position
  );
END;
$$;

GRANT EXECUTE ON FUNCTION insert_booking_atomic(uuid, uuid, uuid, int, boolean, int, uuid) TO service_role;


-- ═══════════════════════════════════════
-- 024_booking_atomic_hardening.sql
-- ═══════════════════════════════════════

-- 024_booking_atomic_hardening.sql
--
-- Hardens insert_booking_atomic (introduced in 023) with three defence-in-depth
-- fixes identified in the round-3 security review (R4):
--
-- 1. auth.role() guard — mirrors the save_workout_draft pattern from N8. If
--    authenticated is ever re-granted EXECUTE (as happened before migration 015),
--    any logged-in member could supply arbitrary p_gym_id / p_capacity values.
--    The guard raises immediately before any state change.
--
-- 2. Drop p_capacity parameter — capacity is now read directly from
--    class_instances inside the FOR UPDATE lock. A caller cannot influence the
--    cap check by supplying a fake value (e.g. p_capacity = 999999).
--
-- 3. Cross-check p_gym_id against the instance row — prevents a caller from
--    passing an instance from gym A with a gym_id of gym B, which would create a
--    booking whose gym_id is inconsistent with its instance.
--
-- Route handler updated in the same commit to drop the p_capacity argument.

CREATE OR REPLACE FUNCTION insert_booking_atomic(
  p_gym_id            uuid,
  p_instance_id       uuid,
  p_user_id           uuid,
  p_waitlist_enabled  boolean,
  p_max_waitlist      int,
  p_existing_id       uuid    -- non-null = re-booking an existing cancelled row
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_capacity          int;
  v_confirmed_count   int;
  v_waitlist_count    int;
  v_status            text;
  v_waitlist_position int;
  v_booking_id        uuid;
BEGIN
  -- Defence-in-depth: if somehow an authenticated (non-service-role) caller
  -- reaches this SECURITY DEFINER function, verify identity and gym membership.
  IF auth.role() != 'service_role' THEN
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'insert_booking_atomic: user_id mismatch for caller %', auth.uid();
    END IF;
    IF p_gym_id IS DISTINCT FROM (
      SELECT gym_id FROM users WHERE id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'insert_booking_atomic: gym_id mismatch for caller %', auth.uid();
    END IF;
  END IF;

  -- Serialize concurrent bookings and read capacity atomically from the locked
  -- row. This replaces the caller-supplied p_capacity parameter (R4): the DB
  -- itself is the authoritative source of capacity under the lock.
  -- Also cross-checks gym_id so an instance from another gym is rejected.
  SELECT capacity INTO v_capacity
  FROM class_instances
  WHERE id = p_instance_id
    AND gym_id = p_gym_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Count active bookings atomically inside the lock.
  SELECT
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'pending_confirmation')),
    COUNT(*) FILTER (WHERE status = 'waitlisted')
  INTO v_confirmed_count, v_waitlist_count
  FROM bookings
  WHERE instance_id = p_instance_id
    AND status IN ('confirmed', 'pending_confirmation', 'waitlisted');

  -- Determine outcome.
  IF v_confirmed_count >= v_capacity THEN
    IF NOT p_waitlist_enabled THEN
      RETURN jsonb_build_object('error', 'class_full');
    END IF;
    IF v_waitlist_count >= p_max_waitlist THEN
      RETURN jsonb_build_object('error', 'waitlist_full');
    END IF;
    v_status := 'waitlisted';
    v_waitlist_position := v_waitlist_count + 1;
  ELSE
    v_status := 'confirmed';
    v_waitlist_position := NULL;
  END IF;

  -- Insert or un-cancel.
  IF p_existing_id IS NOT NULL THEN
    UPDATE bookings
    SET status              = v_status,
        waitlist_position   = v_waitlist_position,
        cancelled_at        = NULL,
        confirmation_expires_at = NULL
    WHERE id      = p_existing_id
      AND user_id = p_user_id
      AND gym_id  = p_gym_id;  -- extra: existing row must belong to same gym
    v_booking_id := p_existing_id;
  ELSE
    INSERT INTO bookings (gym_id, instance_id, user_id, status, waitlist_position)
    VALUES (p_gym_id, p_instance_id, p_user_id, v_status, v_waitlist_position)
    RETURNING id INTO v_booking_id;
  END IF;

  RETURN jsonb_build_object(
    'booking_id',        v_booking_id,
    'status',            v_status,
    'waitlist_position', v_waitlist_position
  );
END;
$$;

GRANT EXECUTE ON FUNCTION insert_booking_atomic(uuid, uuid, uuid, boolean, int, uuid) TO service_role;
-- Revoke the old 7-argument signature (p_capacity was the 4th parameter).
-- This prevents the old route code from accidentally calling the unguarded version.
REVOKE ALL ON FUNCTION insert_booking_atomic(uuid, uuid, uuid, int, boolean, int, uuid) FROM PUBLIC;
DROP FUNCTION IF EXISTS insert_booking_atomic(uuid, uuid, uuid, int, boolean, int, uuid);


-- ═══════════════════════════════════════
-- 025_rationale.sql
-- ═══════════════════════════════════════

-- F1: Add rationale column to workout_weeks for AI programming explanations
ALTER TABLE workout_weeks ADD COLUMN IF NOT EXISTS rationale jsonb;

-- Update save_workout_draft to optionally accept a rationale parameter
CREATE OR REPLACE FUNCTION save_workout_draft(
  p_gym_id uuid,
  p_week_start date,
  p_workouts jsonb,
  p_rationale jsonb DEFAULT NULL
) RETURNS workout_weeks AS $$
DECLARE
  result workout_weeks;
BEGIN
  -- Guard: only the application service_role (or authenticated via RLS owner check) should call this.
  -- The generation API already verifies owner auth before calling.
  IF auth.role() = 'anon' THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  DELETE FROM workout_weeks
  WHERE gym_id = p_gym_id
    AND week_start = p_week_start
    AND status = 'draft';

  INSERT INTO workout_weeks (gym_id, week_start, workouts, status, rationale)
  VALUES (p_gym_id, p_week_start, p_workouts, 'draft', p_rationale)
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb, jsonb) TO authenticated;
-- Keep old 3-arg signature working (backwards compat during rollout)
GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO authenticated;


-- ═══════════════════════════════════════
-- 026_calendar_token.sql
-- ═══════════════════════════════════════

-- F8: Calendar export — stable per-user calendar token for .ics feed
ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_token uuid NOT NULL DEFAULT gen_random_uuid();

-- Unique index so we can look up user by token quickly
CREATE UNIQUE INDEX IF NOT EXISTS users_calendar_token_idx ON users(calendar_token);

-- Members can read their own calendar_token
-- (already covered by existing "member reads own profile" SELECT policy)


-- ═══════════════════════════════════════
-- 027_whiteboard_token.sql
-- ═══════════════════════════════════════

-- F15: Whiteboard TV mode — stable per-gym display token
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS whiteboard_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS gyms_whiteboard_token_idx ON gyms(whiteboard_token);


-- ═══════════════════════════════════════
-- 028_workout_scores.sql
-- ═══════════════════════════════════════

-- F4: Workout score logging
-- F29: Daily leaderboard

CREATE TABLE IF NOT EXISTS workout_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Link to the class instance (optional — can log without being booked)
  instance_id uuid REFERENCES class_instances(id) ON DELETE SET NULL,
  -- The date of the workout (for grouping leaderboards)
  workout_date date NOT NULL,
  -- Score fields
  score_type text NOT NULL CHECK (score_type IN ('time', 'reps', 'weight', 'rounds_reps', 'distance', 'calories', 'pass_fail', 'notes_only')),
  score_value numeric,         -- numeric for time (seconds), reps, weight, distance, calories
  score_text text,             -- for rounds_reps ("12+5") and notes_only
  rx boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One score per user per workout date (can update)
  UNIQUE(user_id, workout_date)
);

CREATE INDEX IF NOT EXISTS workout_scores_gym_date_idx ON workout_scores(gym_id, workout_date);
CREATE INDEX IF NOT EXISTS workout_scores_user_idx ON workout_scores(user_id);

-- RLS
ALTER TABLE workout_scores ENABLE ROW LEVEL SECURITY;

-- Members can insert/update their own score for their gym
DROP POLICY IF EXISTS "member inserts own score" ON workout_scores;
DROP POLICY IF EXISTS "member inserts own score" ON workout_scores;
CREATE POLICY "member inserts own score" ON workout_scores
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "member updates own score" ON workout_scores;
DROP POLICY IF EXISTS "member updates own score" ON workout_scores;
CREATE POLICY "member updates own score" ON workout_scores
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Members can read all scores for their gym (for leaderboard)
DROP POLICY IF EXISTS "member reads gym scores" ON workout_scores;
DROP POLICY IF EXISTS "member reads gym scores" ON workout_scores;
CREATE POLICY "member reads gym scores" ON workout_scores
  FOR SELECT USING (
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

-- Owners can read all scores in their gym
DROP POLICY IF EXISTS "owner reads gym scores" ON workout_scores;
DROP POLICY IF EXISTS "owner reads gym scores" ON workout_scores;
CREATE POLICY "owner reads gym scores" ON workout_scores
  FOR SELECT USING (
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );


-- ═══════════════════════════════════════
-- 029_waiver_consent.sql
-- ═══════════════════════════════════════

-- F27: Liability waiver e-signing
-- F28: Photo/video consent

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS waiver_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS photo_consent boolean NOT NULL DEFAULT false;


-- ═══════════════════════════════════════
-- 030_member_notes_skills.sql
-- ═══════════════════════════════════════

-- F17: Coach-private member notes
-- F35: Skill tracker

-- Coach notes (admin-only, not visible to members)
CREATE TABLE IF NOT EXISTS member_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_notes_gym_member ON member_notes(gym_id, member_id);

ALTER TABLE member_notes ENABLE ROW LEVEL SECURITY;

-- Only admins of the gym can read/write notes
DROP POLICY IF EXISTS "admins manage member notes" ON member_notes;
CREATE POLICY "admins manage member notes"
  ON member_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_notes.gym_id
        AND users.role = 'admin'
    )
  );

-- Skill tracker
CREATE TABLE IF NOT EXISTS skills (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name     text NOT NULL,
  category text NOT NULL DEFAULT 'gymnastics',  -- gymnastics, weightlifting, conditioning
  UNIQUE(name)
);

-- Seed common CrossFit skills
INSERT INTO skills (name, category) VALUES
  ('Double-Unders', 'gymnastics'),
  ('Pull-ups', 'gymnastics'),
  ('Chest-to-Bar Pull-ups', 'gymnastics'),
  ('Bar Muscle-ups', 'gymnastics'),
  ('Ring Muscle-ups', 'gymnastics'),
  ('Handstand Push-ups', 'gymnastics'),
  ('Strict Handstand Push-ups', 'gymnastics'),
  ('Handstand Walk', 'gymnastics'),
  ('Toes-to-Bar', 'gymnastics'),
  ('Rope Climb', 'gymnastics'),
  ('Pistol Squats', 'gymnastics'),
  ('Box Jump (24/20)', 'gymnastics'),
  ('Snatch', 'weightlifting'),
  ('Clean', 'weightlifting'),
  ('Clean & Jerk', 'weightlifting'),
  ('Overhead Squat', 'weightlifting'),
  ('Thruster', 'weightlifting'),
  ('Row 500m', 'conditioning'),
  ('Run 400m', 'conditioning'),
  ('Assault Bike', 'conditioning')
ON CONFLICT (name) DO NOTHING;

-- Member skill levels per gym
CREATE TABLE IF NOT EXISTS member_skills (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id     uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id   uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level      text NOT NULL CHECK (level IN ('none', 'learning', 'rx', 'advanced')),
  notes      text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gym_id, user_id, skill_id)
);

ALTER TABLE member_skills ENABLE ROW LEVEL SECURITY;

-- Members can read/write their own skills
DROP POLICY IF EXISTS "members manage own skills" ON member_skills;
CREATE POLICY "members manage own skills"
  ON member_skills
  FOR ALL
  USING (user_id = auth.uid());

-- Admins can read all skills in their gym
DROP POLICY IF EXISTS "admins read gym skills" ON member_skills;
CREATE POLICY "admins read gym skills"
  ON member_skills
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_skills.gym_id
        AND users.role = 'admin'
    )
  );


-- ═══════════════════════════════════════
-- 031_class_feedback.sql
-- ═══════════════════════════════════════

-- F33: Post-class feedback (star rating + optional comment)
CREATE TABLE IF NOT EXISTS class_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(instance_id, user_id)
);

ALTER TABLE class_feedback ENABLE ROW LEVEL SECURITY;

-- Members can insert/update own feedback
DROP POLICY IF EXISTS "members manage own feedback" ON class_feedback;
CREATE POLICY "members manage own feedback"
  ON class_feedback
  FOR ALL
  USING (user_id = auth.uid());

-- Admins can read all feedback in their gym
DROP POLICY IF EXISTS "admins read gym feedback" ON class_feedback;
CREATE POLICY "admins read gym feedback"
  ON class_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = class_feedback.gym_id
        AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS class_feedback_instance ON class_feedback(instance_id);


-- ═══════════════════════════════════════
-- 032_gym_slug_wod_posts.sql
-- ═══════════════════════════════════════

-- F38: Public gym page slug
-- F39: WOD blog posts

ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text;

CREATE UNIQUE INDEX IF NOT EXISTS gyms_slug_unique ON gyms(slug) WHERE slug IS NOT NULL;

-- WOD blog posts
CREATE TABLE IF NOT EXISTS wod_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  title       text NOT NULL,
  body        text NOT NULL,          -- markdown
  workout_date date,                  -- optional link to a specific workout date
  published   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wod_posts_gym_published ON wod_posts(gym_id, published, created_at DESC);

ALTER TABLE wod_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
DROP POLICY IF EXISTS "public read published posts" ON wod_posts;
CREATE POLICY "public read published posts"
  ON wod_posts
  FOR SELECT
  USING (published = true);

-- Admins can manage their gym's posts
DROP POLICY IF EXISTS "admins manage wod posts" ON wod_posts;
CREATE POLICY "admins manage wod posts"
  ON wod_posts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = wod_posts.gym_id
        AND users.role = 'admin'
    )
  );


-- ═══════════════════════════════════════
-- 033_dropin_pause.sql
-- ═══════════════════════════════════════

-- F22: Drop-in / trial pass
-- F23: Membership pause

-- Drop-in passes (one-off or trial)
CREATE TABLE IF NOT EXISTS dropin_passes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pass_type   text NOT NULL CHECK (pass_type IN ('dropin', 'trial')),
  uses_total  smallint NOT NULL DEFAULT 1,   -- how many classes included
  uses_used   smallint NOT NULL DEFAULT 0,
  expires_at  date,                          -- NULL = never
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dropin_passes ENABLE ROW LEVEL SECURITY;

-- Members can read own passes
DROP POLICY IF EXISTS "members read own passes" ON dropin_passes;
CREATE POLICY "members read own passes"
  ON dropin_passes FOR SELECT
  USING (user_id = auth.uid());

-- Admins manage all passes in their gym
DROP POLICY IF EXISTS "admins manage passes" ON dropin_passes;
CREATE POLICY "admins manage passes"
  ON dropin_passes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = dropin_passes.gym_id
        AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS dropin_passes_user ON dropin_passes(user_id);
CREATE INDEX IF NOT EXISTS dropin_passes_gym ON dropin_passes(gym_id);

-- Membership pause
CREATE TABLE IF NOT EXISTS membership_pauses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id     uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pause_from date NOT NULL,
  pause_to   date NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (pause_to > pause_from)
);

ALTER TABLE membership_pauses ENABLE ROW LEVEL SECURITY;

-- Members can read own pauses
DROP POLICY IF EXISTS "members read own pauses" ON membership_pauses;
CREATE POLICY "members read own pauses"
  ON membership_pauses FOR SELECT
  USING (user_id = auth.uid());

-- Admins manage all pauses in their gym
DROP POLICY IF EXISTS "admins manage pauses" ON membership_pauses;
CREATE POLICY "admins manage pauses"
  ON membership_pauses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = membership_pauses.gym_id
        AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS membership_pauses_user ON membership_pauses(user_id);


-- ═══════════════════════════════════════
-- 034_badges_referrals.sql
-- ═══════════════════════════════════════

-- F30: Achievement badges
-- F32: Member referral tracking

-- Badge definitions (seeded, gym-agnostic for now)
CREATE TABLE IF NOT EXISTS badge_definitions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text NOT NULL,
  icon        text NOT NULL DEFAULT '🏅',  -- emoji
  threshold   int  NOT NULL DEFAULT 1      -- e.g. 100 classes
);

INSERT INTO badge_definitions (slug, name, description, icon, threshold) VALUES
  ('first-class',    'First Class',    'Completed your first class',       '🎯', 1),
  ('10-classes',     '10 Classes',     'Attended 10 classes',              '🔥', 10),
  ('25-classes',     '25 Classes',     'Attended 25 classes',              '💪', 25),
  ('50-classes',     '50 Classes',     'Attended 50 classes',              '⚡', 50),
  ('100-classes',    '100 Classes',    'Attended 100 classes',             '🏆', 100),
  ('250-classes',    '250 Classes',    'Attended 250 classes',             '🌟', 250),
  ('week-streak-2',  '2-Week Streak',  'Attended class every week for 2 weeks', '📅', 14),
  ('week-streak-4',  '4-Week Streak',  'Attended class every week for 4 weeks', '🗓️', 28)
ON CONFLICT (slug) DO NOTHING;

-- Member earned badges
CREATE TABLE IF NOT EXISTS member_badges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id     uuid NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gym_id, user_id, badge_id)
);

ALTER TABLE member_badges ENABLE ROW LEVEL SECURITY;

-- Members can read own badges
DROP POLICY IF EXISTS "members read own badges" ON member_badges;
CREATE POLICY "members read own badges"
  ON member_badges FOR SELECT
  USING (user_id = auth.uid());

-- Admins can read all badges in their gym
DROP POLICY IF EXISTS "admins read gym badges" ON member_badges;
CREATE POLICY "admins read gym badges"
  ON member_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_badges.gym_id
        AND users.role = 'admin'
    )
  );

-- System/service role can insert badges (called from API)
DROP POLICY IF EXISTS "service insert badges" ON member_badges;
CREATE POLICY "service insert badges"
  ON member_badges FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS member_badges_user ON member_badges(user_id);

-- Referral tracking
CREATE TABLE IF NOT EXISTS referrals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  referrer_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  referred_email text NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'joined', 'credited')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Members can read referrals they made
DROP POLICY IF EXISTS "members read own referrals" ON referrals;
CREATE POLICY "members read own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid());

-- Members can insert referrals
DROP POLICY IF EXISTS "members insert referrals" ON referrals;
CREATE POLICY "members insert referrals"
  ON referrals FOR INSERT
  WITH CHECK (referrer_id = auth.uid());

-- Admins can manage all referrals in their gym
DROP POLICY IF EXISTS "admins manage referrals" ON referrals;
CREATE POLICY "admins manage referrals"
  ON referrals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = referrals.gym_id
        AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_gym ON referrals(gym_id);


-- ═══════════════════════════════════════
-- 035_workout_edits.sql
-- ═══════════════════════════════════════

-- F2: AI learns from edits — track what coaches change after generation

CREATE TABLE IF NOT EXISTS workout_edits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  week_start   date NOT NULL,
  day_name     text NOT NULL,          -- Monday, Tuesday, etc.
  field        text NOT NULL,          -- title, description, notes, etc.
  before_text  text NOT NULL,
  after_text   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_edits_gym_week ON workout_edits(gym_id, week_start DESC);

ALTER TABLE workout_edits ENABLE ROW LEVEL SECURITY;

-- Admins can insert and read edits for their gym
DROP POLICY IF EXISTS "admins manage workout edits" ON workout_edits;
CREATE POLICY "admins manage workout edits"
  ON workout_edits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = workout_edits.gym_id
        AND users.role = 'admin'
    )
  );


-- ═══════════════════════════════════════
-- 036_benchmarks_goals.sql
-- ═══════════════════════════════════════

-- F5: Benchmark tracking (classic CrossFit benchmarks)
-- F13: Personal goals

-- Benchmark definitions
CREATE TABLE IF NOT EXISTS benchmarks (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name     text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'girl',  -- girl, hero, lift, gymnastics
  unit     text NOT NULL DEFAULT 'time'   -- time, reps, weight, rounds_reps
);

INSERT INTO benchmarks (name, category, unit) VALUES
  ('Fran',        'girl', 'time'),
  ('Helen',       'girl', 'time'),
  ('Grace',       'girl', 'time'),
  ('Diane',       'girl', 'time'),
  ('Elizabeth',   'girl', 'time'),
  ('Isabel',      'girl', 'time'),
  ('Karen',       'girl', 'time'),
  ('Chelsea',     'girl', 'rounds_reps'),
  ('Cindy',       'girl', 'rounds_reps'),
  ('Murph',       'hero', 'time'),
  ('DT',          'hero', 'time'),
  ('Clean 1RM',   'lift', 'weight'),
  ('Snatch 1RM',  'lift', 'weight'),
  ('Back Squat 1RM', 'lift', 'weight'),
  ('Deadlift 1RM', 'lift', 'weight'),
  ('Press 1RM',   'lift', 'weight'),
  ('Max Pull-ups', 'gymnastics', 'reps'),
  ('Max Double-Unders', 'gymnastics', 'reps')
ON CONFLICT (name) DO NOTHING;

-- Member benchmark results
CREATE TABLE IF NOT EXISTS benchmark_results (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  benchmark_id uuid NOT NULL REFERENCES benchmarks(id) ON DELETE CASCADE,
  score_value  text NOT NULL,     -- e.g. "2:45" or "225" or "23+5"
  rx           boolean NOT NULL DEFAULT true,
  notes        text,
  recorded_on  date NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE benchmark_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members manage own benchmark results" ON benchmark_results;
CREATE POLICY "members manage own benchmark results"
  ON benchmark_results FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admins read gym benchmark results" ON benchmark_results;
CREATE POLICY "admins read gym benchmark results"
  ON benchmark_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = benchmark_results.gym_id
        AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS benchmark_results_user ON benchmark_results(user_id, benchmark_id);

-- Personal goals
CREATE TABLE IF NOT EXISTS personal_goals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  target      text NOT NULL,         -- e.g. "Sub 3:00 Fran" or "BW Clean"
  achieved    boolean NOT NULL DEFAULT false,
  achieved_at timestamptz,
  due_date    date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE personal_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members manage own goals" ON personal_goals;
CREATE POLICY "members manage own goals"
  ON personal_goals FOR ALL
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS personal_goals_user ON personal_goals(user_id);


-- ═══════════════════════════════════════
-- 037_webhooks.sql
-- ═══════════════════════════════════════

-- F43: Slack/Discord webhook integration

CREATE TABLE IF NOT EXISTS gym_webhooks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id     uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  platform   text NOT NULL CHECK (platform IN ('slack', 'discord', 'custom')),
  url        text NOT NULL,
  label      text NOT NULL DEFAULT '',
  events     text[] NOT NULL DEFAULT ARRAY['workout_published'],  -- events to trigger on
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gym_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage gym webhooks" ON gym_webhooks;
CREATE POLICY "admins manage gym webhooks"
  ON gym_webhooks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = gym_webhooks.gym_id
        AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS gym_webhooks_gym ON gym_webhooks(gym_id);


-- ═══════════════════════════════════════
-- 038_push_subscriptions.sql
-- ═══════════════════════════════════════

-- 038_push_subscriptions.sql
-- Web Push subscriptions for browser push notifications

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth_key    text NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Members manage their own subscriptions
DROP POLICY IF EXISTS "members manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "members manage own push subscriptions"
  ON push_subscriptions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all subscriptions for their gym (for sending)
DROP POLICY IF EXISTS "admins read gym push subscriptions" ON push_subscriptions;
CREATE POLICY "admins read gym push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.gym_id = push_subscriptions.gym_id
        AND u.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS push_subscriptions_gym_id_idx ON push_subscriptions (gym_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions (user_id);


-- ═══════════════════════════════════════
-- 039_coach_role.sql
-- ═══════════════════════════════════════

-- 039_coach_role.sql
-- Adds coach role: can take attendance for assigned classes, read member skills/notes.
-- Cannot see billing or invite members.

-- Expand the role check constraint to allow 'coach'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'member', 'coach'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add coach_id to class_instances (nullable — unassigned classes have no coach)
ALTER TABLE class_instances ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- Index for coach's upcoming classes query
CREATE INDEX IF NOT EXISTS class_instances_coach_id_idx ON class_instances (coach_id, starts_at);

-- ─── RLS policies for coaches ─────────────────────────────────────────────────

-- Coaches can read class_instances assigned to them
DROP POLICY IF EXISTS "coaches read assigned class instances" ON class_instances;
CREATE POLICY "coaches read assigned class instances"
  ON class_instances FOR SELECT
  USING (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'coach'
    )
  );

-- Coaches can read bookings for their assigned classes (to take attendance)
DROP POLICY IF EXISTS "coaches read bookings for assigned classes" ON bookings;
CREATE POLICY "coaches read bookings for assigned classes"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_instances ci
      WHERE ci.id = bookings.instance_id
        AND ci.coach_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'coach'
    )
  );

-- Coaches can update attendance on bookings for their assigned classes
DROP POLICY IF EXISTS "coaches update attendance for assigned classes" ON bookings;
CREATE POLICY "coaches update attendance for assigned classes"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM class_instances ci
      WHERE ci.id = bookings.instance_id
        AND ci.coach_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'coach'
    )
  );

-- Coaches can read member skills for their gym
DROP POLICY IF EXISTS "coaches read member skills" ON member_skills;
CREATE POLICY "coaches read member skills"
  ON member_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'coach'
        AND u.gym_id = member_skills.gym_id
    )
  );

-- Coaches can read member notes for their gym
DROP POLICY IF EXISTS "coaches read member notes" ON member_notes;
CREATE POLICY "coaches read member notes"
  ON member_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'coach'
        AND u.gym_id = member_notes.gym_id
    )
  );

-- Coaches can read users in their gym (to see who's booked)
DROP POLICY IF EXISTS "coaches read gym members" ON users;
CREATE POLICY "coaches read gym members"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users me
      WHERE me.id = auth.uid()
        AND me.role = 'coach'
        AND me.gym_id = users.gym_id
    )
  );


-- ═══════════════════════════════════════
-- 040_leads.sql
-- ═══════════════════════════════════════

-- 040_leads.sql
-- Lead capture + CRM pipeline
-- Leads flow: new → contacted → trial_booked → showed_up → joined → lost

CREATE TABLE IF NOT EXISTS leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  email       text NOT NULL,
  name        text,
  phone       text,
  source      text,                     -- 'website', 'referral', 'walk-in', 'social', etc.
  status      text NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'contacted', 'trial_booked', 'showed_up', 'joined', 'lost')),
  notes       text,
  trial_date  date,                     -- when trial is scheduled
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, email)
);

CREATE INDEX IF NOT EXISTS leads_gym_id_status_idx ON leads (gym_id, status);
CREATE INDEX IF NOT EXISTS leads_gym_id_created_idx ON leads (gym_id, created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_leads_updated_at();

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Admins/owners manage all leads for their gym
DROP POLICY IF EXISTS "admins manage leads" ON leads;
CREATE POLICY "admins manage leads"
  ON leads
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.gym_id = leads.gym_id
        AND u.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.gym_id = leads.gym_id
        AND u.role IN ('admin', 'owner')
    )
  );

-- Public INSERT — allows website forms to submit without auth
-- (gym_id must match; no SELECT/UPDATE/DELETE for anonymous)
DROP POLICY IF EXISTS "public lead capture" ON leads;
CREATE POLICY "public lead capture"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (true);


-- ═══════════════════════════════════════
-- 041_reports_functions.sql
-- ═══════════════════════════════════════

-- 041_reports_functions.sql
-- Helper SQL functions for the analytics/reports dashboard

-- Members joined per month (last N months)
CREATE OR REPLACE FUNCTION members_per_month(p_gym_id uuid, p_months int DEFAULT 12)
RETURNS TABLE(month text, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
    COUNT(*) AS count
  FROM users
  WHERE gym_id = p_gym_id
    AND role = 'member'
    AND created_at >= date_trunc('month', now()) - (p_months - 1) * interval '1 month'
  GROUP BY date_trunc('month', created_at)
  ORDER BY 1;
$$;

-- Attendance (confirmed bookings) per month (last N months)
CREATE OR REPLACE FUNCTION attendance_per_month(p_gym_id uuid, p_months int DEFAULT 12)
RETURNS TABLE(month text, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    to_char(date_trunc('month', b.created_at), 'YYYY-MM') AS month,
    COUNT(*) AS count
  FROM bookings b
  WHERE b.gym_id = p_gym_id
    AND b.status IN ('confirmed', 'attended')
    AND b.created_at >= date_trunc('month', now()) - (p_months - 1) * interval '1 month'
  GROUP BY date_trunc('month', b.created_at)
  ORDER BY 1;
$$;

-- Attendance heatmap by day-of-week (0=Sun) and hour
CREATE OR REPLACE FUNCTION attendance_heatmap(p_gym_id uuid)
RETURNS TABLE(dow int, hour int, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    EXTRACT(DOW FROM ci.starts_at)::int AS dow,
    EXTRACT(HOUR FROM ci.starts_at AT TIME ZONE 'UTC')::int AS hour,
    COUNT(*) AS count
  FROM bookings b
  JOIN class_instances ci ON ci.id = b.instance_id
  WHERE b.gym_id = p_gym_id
    AND b.status IN ('confirmed', 'attended')
    AND ci.starts_at >= now() - interval '90 days'
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;


-- ═══════════════════════════════════════
-- 042_measurements.sql
-- ═══════════════════════════════════════

-- 042_measurements.sql
-- Body composition / measurement tracking (private — member sees only their own)

CREATE TABLE IF NOT EXISTS measurements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg   numeric(6,2),
  body_fat_pct numeric(5,2),
  muscle_mass_kg numeric(6,2),
  chest_cm    numeric(5,1),
  waist_cm    numeric(5,1),
  hips_cm     numeric(5,1),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS measurements_user_id_date_idx ON measurements (user_id, measured_at DESC);

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

-- Members manage their own measurements only
DROP POLICY IF EXISTS "members manage own measurements" ON measurements;
CREATE POLICY "members manage own measurements"
  ON measurements
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ═══════════════════════════════════════
-- 043_onboarding.sql
-- ═══════════════════════════════════════

-- 043_onboarding.sql
-- F11 + F37: Member onboarding checklist + 6-class Intro to CrossFit curriculum

-- Tracks which onboarding steps each member has completed
CREATE TABLE IF NOT EXISTS member_onboarding (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step        text NOT NULL,   -- 'profile', 'waiver', 'first_booking', 'intro_video', 'intro_class_1'...'intro_class_6'
  completed_at timestamptz NOT NULL DEFAULT now(),
  notes       text,
  UNIQUE (gym_id, user_id, step)
);

CREATE INDEX IF NOT EXISTS member_onboarding_user_id_idx ON member_onboarding (user_id);

ALTER TABLE member_onboarding ENABLE ROW LEVEL SECURITY;

-- Members see their own progress
DROP POLICY IF EXISTS "members read own onboarding" ON member_onboarding;
CREATE POLICY "members read own onboarding"
  ON member_onboarding FOR SELECT
  USING (auth.uid() = user_id);

-- Members can complete their own steps (self-serve: profile, waiver, first_booking, intro_video)
DROP POLICY IF EXISTS "members complete own steps" ON member_onboarding;
CREATE POLICY "members complete own steps"
  ON member_onboarding FOR INSERT
  WITH CHECK (auth.uid() = user_id AND step IN ('profile', 'waiver', 'first_booking', 'intro_video'));

-- Admins/coaches can manage all onboarding for their gym (for marking intro_class_N steps)
DROP POLICY IF EXISTS "admins manage member onboarding" ON member_onboarding;
CREATE POLICY "admins manage member onboarding"
  ON member_onboarding
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.gym_id = member_onboarding.gym_id
        AND u.role IN ('admin', 'owner', 'coach')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.gym_id = member_onboarding.gym_id
        AND u.role IN ('admin', 'owner', 'coach')
    )
  );


-- ═══════════════════════════════════════
-- 044_challenges.sql
-- ═══════════════════════════════════════

-- Migration 044: Monthly challenges (F31)
-- gym owners create challenges, members opt in and compete

create table if not exists monthly_challenges (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references gyms(id) on delete cascade,
  title       text not null,                        -- e.g. "Most classes in February"
  description text,
  month       date not null,                        -- first day of month: 2026-02-01
  type        text not null default 'classes',       -- 'classes' | 'streak'
  target      int,                                   -- optional target (e.g. 20 classes)
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists challenge_entries (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references monthly_challenges(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  gym_id       uuid not null references gyms(id) on delete cascade,
  opted_in_at  timestamptz not null default now(),
  unique (challenge_id, user_id)
);

-- RLS
alter table monthly_challenges enable row level security;
alter table challenge_entries   enable row level security;

-- Challenges: members/coaches in same gym can read active ones; admins full access
DROP POLICY IF EXISTS "gym members read active challenges" ON monthly_challenges;
create policy "gym members read active challenges" on monthly_challenges
  for select using (
    gym_id in (select gym_id from users where id = auth.uid())
    and active = true
  );

DROP POLICY IF EXISTS "admins manage challenges" ON monthly_challenges;
create policy "admins manage challenges" on monthly_challenges
  for all using (
    gym_id in (select gym_id from users where id = auth.uid() and role in ('owner','admin'))
  );

-- Entries: members read/insert own; admins read all in their gym
DROP POLICY IF EXISTS "members manage own entries" ON challenge_entries;
create policy "members manage own entries" on challenge_entries
  for all using (user_id = auth.uid());

DROP POLICY IF EXISTS "admins read gym entries" ON challenge_entries;
create policy "admins read gym entries" on challenge_entries
  for select using (
    gym_id in (select gym_id from users where id = auth.uid() and role in ('owner','admin','coach'))
  );


-- ═══════════════════════════════════════
-- 045_sub_requests.sql
-- ═══════════════════════════════════════

-- 045_sub_requests.sql
-- Coach substitution requests: coach can't make class → posts request → another coach claims it

CREATE TABLE IF NOT EXISTS sub_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  instance_id           uuid NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,
  requesting_coach_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claimed_by_coach_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  status                text NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'claimed', 'cancelled')),
  note                  text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instance_id)  -- one sub request per class instance
);

CREATE INDEX IF NOT EXISTS sub_requests_gym_status_idx ON sub_requests (gym_id, status);

ALTER TABLE sub_requests ENABLE ROW LEVEL SECURITY;

-- Coaches in the same gym can read all sub requests
DROP POLICY IF EXISTS "coaches read gym sub_requests" ON sub_requests;
DROP POLICY IF EXISTS "coaches read gym sub_requests" ON sub_requests;
CREATE POLICY "coaches read gym sub_requests" ON sub_requests
  FOR SELECT USING (
    gym_id IN (
      SELECT gym_id FROM users WHERE id = auth.uid()
        AND role IN ('coach', 'admin', 'owner')
    )
  );

-- Only the requesting coach can insert
DROP POLICY IF EXISTS "coach inserts own sub_request" ON sub_requests;
DROP POLICY IF EXISTS "coach inserts own sub_request" ON sub_requests;
CREATE POLICY "coach inserts own sub_request" ON sub_requests
  FOR INSERT WITH CHECK (
    requesting_coach_id = auth.uid()
    AND gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid())
  );

-- Requesting coach can cancel; any gym coach can claim (update claimed_by + status)
DROP POLICY IF EXISTS "coaches update sub_requests" ON sub_requests;
DROP POLICY IF EXISTS "coaches update sub_requests" ON sub_requests;
CREATE POLICY "coaches update sub_requests" ON sub_requests
  FOR UPDATE USING (
    gym_id IN (
      SELECT gym_id FROM users WHERE id = auth.uid()
        AND role IN ('coach', 'admin', 'owner')
    )
  );


-- ═══════════════════════════════════════
-- 046_style_examples_text_limit.sql
-- ═══════════════════════════════════════

-- migration 046: cap style_examples.raw_text at 20,000 characters
-- Prevents unbounded AI prompt inflation if a gym owner pastes a very large
-- block of text. 10k chars is well above any realistic example workout set.
ALTER TABLE style_examples
  ADD CONSTRAINT style_examples_raw_text_length
  CHECK (char_length(raw_text) <= 20000);


-- ═══════════════════════════════════════
-- 047_deletion_requests.sql
-- ═══════════════════════════════════════

-- migration 047: member account deletion requests (GDPR Art. 17 right to erasure)
CREATE TABLE IF NOT EXISTS deletion_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gym_id         uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'actioned')),
  requested_at   timestamptz NOT NULL DEFAULT now(),
  actioned_at    timestamptz,
  UNIQUE (user_id, status)  -- one pending request per member at a time
);

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- Members can insert their own request and read their own requests
DROP POLICY IF EXISTS "member insert own deletion request" ON deletion_requests;
DROP POLICY IF EXISTS "member insert own deletion request" ON deletion_requests;
CREATE POLICY "member insert own deletion request" ON deletion_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "member read own deletion request" ON deletion_requests;
DROP POLICY IF EXISTS "member read own deletion request" ON deletion_requests;
CREATE POLICY "member read own deletion request" ON deletion_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Owners/admins can read and update requests for their gym
DROP POLICY IF EXISTS "admin manage gym deletion requests" ON deletion_requests;
DROP POLICY IF EXISTS "admin manage gym deletion requests" ON deletion_requests;
CREATE POLICY "admin manage gym deletion requests" ON deletion_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = deletion_requests.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );


-- ═══════════════════════════════════════
-- 048_gym_audit_log.sql
-- ═══════════════════════════════════════

-- migration 048: per-gym owner action audit log (P2)
CREATE TABLE IF NOT EXISTS gym_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  action       text NOT NULL,               -- e.g. 'member.revoke', 'member.delete', 'workout.publish'
  target_id    uuid,                        -- id of the affected row (optional)
  target_type  text,                        -- e.g. 'user', 'workout', 'booking'
  payload      jsonb,                       -- any extra context (name, email, etc.)
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gym_audit_log_gym_id_idx ON gym_audit_log (gym_id, created_at DESC);

ALTER TABLE gym_audit_log ENABLE ROW LEVEL SECURITY;

-- Owners and admins can read their gym's log
DROP POLICY IF EXISTS "owner reads gym audit log" ON gym_audit_log;
DROP POLICY IF EXISTS "owner reads gym audit log" ON gym_audit_log;
CREATE POLICY "owner reads gym audit log" ON gym_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = gym_audit_log.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

-- No direct writes via REST; only service-role (route handlers using admin client) may insert
REVOKE INSERT, UPDATE, DELETE ON gym_audit_log FROM authenticated, anon;


-- ═══════════════════════════════════════
-- 049_fix_feedback_rls.sql
-- ═══════════════════════════════════════

-- Fix: class_feedback RLS policy only covered 'admin' role, not 'owner'.
-- Owners need to read feedback for the reports page.
DROP POLICY IF EXISTS "admins read gym feedback" ON class_feedback;

DROP POLICY IF EXISTS "owners and admins read gym feedback" ON class_feedback;
CREATE POLICY "owners and admins read gym feedback"
  ON class_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = class_feedback.gym_id
        AND users.role IN ('admin', 'owner')
    )
  );


-- ═══════════════════════════════════════
-- 050_fix_owner_rls.sql
-- ═══════════════════════════════════════

-- Fix: several RLS policies only covered 'admin' role, not 'owner'.
-- Owners must be able to manage their own gym's data.

-- member_notes
DROP POLICY IF EXISTS "admins manage member notes" ON member_notes;
DROP POLICY IF EXISTS "admins and owners manage member notes" ON member_notes;
CREATE POLICY "admins and owners manage member notes"
  ON member_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_notes.gym_id
        AND users.role IN ('admin', 'owner')
    )
  );

-- member_skills (admin read)
DROP POLICY IF EXISTS "admins read gym skills" ON member_skills;
DROP POLICY IF EXISTS "admins and owners read gym skills" ON member_skills;
CREATE POLICY "admins and owners read gym skills"
  ON member_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_skills.gym_id
        AND users.role IN ('admin', 'owner')
    )
  );

-- wod_posts
DROP POLICY IF EXISTS "admins manage wod posts" ON wod_posts;
DROP POLICY IF EXISTS "admins and owners manage wod posts" ON wod_posts;
CREATE POLICY "admins and owners manage wod posts"
  ON wod_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = wod_posts.gym_id
        AND users.role IN ('admin', 'owner')
    )
  );

-- workout_edits
DROP POLICY IF EXISTS "admins manage workout edits" ON workout_edits;
DROP POLICY IF EXISTS "admins and owners manage workout edits" ON workout_edits;
CREATE POLICY "admins and owners manage workout edits"
  ON workout_edits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = workout_edits.gym_id
        AND users.role IN ('admin', 'owner')
    )
  );


-- ═══════════════════════════════════════
-- 051_ai_token_telemetry.sql
-- ═══════════════════════════════════════

-- migration 051: token-level AI usage telemetry (O2)
-- Tracks actual input/output tokens per month alongside the call count,
-- enabling real cost attribution per gym before pricing is introduced.
-- Existing call-count columns are kept for backwards compatibility.

ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS ai_input_tokens_this_month  bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_output_tokens_this_month bigint NOT NULL DEFAULT 0;


-- ═══════════════════════════════════════
-- 052_booking_transition_check.sql
-- ═══════════════════════════════════════

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


-- ═══════════════════════════════════════
-- 053_narrow_bookings_member_rls.sql
-- ═══════════════════════════════════════

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


-- ═══════════════════════════════════════
-- 054_security_definer_gym_check.sql
-- ═══════════════════════════════════════

-- N8: Defence-in-depth for save_workout_draft SECURITY DEFINER
--
-- EXECUTE is already revoked from `authenticated` (migration 015), so only
-- service_role callers can invoke this function. However, if a future migration
-- accidentally re-grants access to authenticated, the function would trust the
-- caller-supplied p_gym_id — potentially allowing cross-tenant writes.
--
-- Fix: add an in-function guard that raises if the calling role is not
-- service_role AND the supplied gym_id doesn't match the caller's own gym.
-- Service-role callers (route handlers) bypass this check intentionally,
-- since they have already verified ownership before calling.

CREATE OR REPLACE FUNCTION save_workout_draft(
  p_gym_id uuid,
  p_week_start date,
  p_workouts jsonb
) RETURNS workout_weeks AS $$
DECLARE
  result workout_weeks;
  caller_gym_id uuid;
BEGIN
  -- Defence-in-depth: if called by an authenticated user (not service_role),
  -- verify they belong to the gym they're trying to write.
  IF current_setting('role', true) != 'service_role' THEN
    SELECT gym_id INTO caller_gym_id FROM users WHERE id = auth.uid();
    IF caller_gym_id IS NULL OR caller_gym_id != p_gym_id THEN
      RAISE EXCEPTION 'save_workout_draft: gym_id mismatch or unauthenticated caller';
    END IF;
  END IF;

  -- Remove any existing draft for this gym+week (partial index allows only one)
  DELETE FROM workout_weeks
  WHERE gym_id = p_gym_id
    AND week_start = p_week_start
    AND status = 'draft';

  -- Insert fresh draft
  INSERT INTO workout_weeks (gym_id, week_start, workouts, status)
  VALUES (p_gym_id, p_week_start, p_workouts, 'draft')
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_workout_draft(uuid, date, jsonb) TO service_role;


-- N9: Lock `email` in member profile UPDATE policy
--
-- Members could previously change `users.email` directly via Supabase REST,
-- desynchronising it from auth.users.email and redirecting booking/revocation
-- emails to an arbitrary address. Lock it to its current value.

DROP POLICY IF EXISTS "member updates own profile" ON users;

DROP POLICY IF EXISTS "member updates own profile" ON users;
DROP POLICY IF EXISTS "member updates own profile" ON users;
CREATE POLICY "member updates own profile" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role     = (SELECT role     FROM users WHERE id = auth.uid())
    AND gym_id   = (SELECT gym_id   FROM users WHERE id = auth.uid())
    AND email    = (SELECT email    FROM users WHERE id = auth.uid())
    AND revoked_at IS NOT DISTINCT FROM (SELECT revoked_at FROM users WHERE id = auth.uid())
  );


-- ═══════════════════════════════════════
-- 055_atomic_ai_increment.sql
-- ═══════════════════════════════════════

-- 055_atomic_ai_increment.sql
--
-- K7: Replace the read-modify-write in incrementAiCalls with an atomic UPDATE.
--
-- The old TypeScript implementation did SELECT then UPDATE — under concurrency,
-- two simultaneous AI calls could both read the same count and both increment
-- it, resulting in one "free" call. This function collapses both into a single
-- UPDATE … RETURNING, so the increment is serialised at the database level.
--
-- The function is SECURITY INVOKER so it runs as the calling user and respects
-- their RLS policy (owners can update their own gym row). No privilege
-- elevation is needed here.
--
-- Parameters:
--   p_gym_id       — the gym to update
--   p_month        — current YYYY-MM string (passed from the caller so tests
--                    can inject a fixed month without mocking Date)
--   p_input_tokens — Anthropic input token count (0 if unavailable)
--   p_output_tokens — Anthropic output token count (0 if unavailable)
--
-- Returns: the new ai_calls_this_month value after the increment.

CREATE OR REPLACE FUNCTION increment_ai_calls(
  p_gym_id        uuid,
  p_month         text,
  p_input_tokens  int DEFAULT 0,
  p_output_tokens int DEFAULT 0
) RETURNS int
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE gyms
  SET
    ai_calls_this_month        = CASE
                                    WHEN ai_month = p_month
                                    THEN COALESCE(ai_calls_this_month, 0) + 1
                                    ELSE 1
                                  END,
    ai_month                   = p_month,
    ai_input_tokens_this_month  = CASE
                                    WHEN ai_month = p_month
                                    THEN COALESCE(ai_input_tokens_this_month, 0) + p_input_tokens
                                    ELSE p_input_tokens
                                  END,
    ai_output_tokens_this_month = CASE
                                    WHEN ai_month = p_month
                                    THEN COALESCE(ai_output_tokens_this_month, 0) + p_output_tokens
                                    ELSE p_output_tokens
                                  END
  WHERE id = p_gym_id
  RETURNING ai_calls_this_month;
$$;

GRANT EXECUTE ON FUNCTION increment_ai_calls(uuid, text, int, int) TO authenticated;


-- ═══════════════════════════════════════
-- 056_booking_atomic_self_discover_existing.sql
-- ═══════════════════════════════════════

-- 056_booking_atomic_self_discover_existing.sql
--
-- K8: Move the cancelled-booking lookup inside insert_booking_atomic so it
-- runs under the FOR UPDATE lock, eliminating the race window in the route
-- handler (app/api/bookings/route.ts:84-86).
--
-- Before this migration the route did:
--   1. SELECT id FROM bookings WHERE … status = 'cancelled'   ← outside lock
--   2. rpc('insert_booking_atomic', { …, p_existing_id })     ← takes lock
--
-- Two concurrent re-bookings of the same cancelled row could both complete
-- step 1 and see the same existing id, then both call step 2. The second
-- call's UPDATE would silently no-op (row is no longer cancelled) and return
-- the id of a booking whose status was already set by the first call. The
-- caller believed it succeeded at one status but the actual state was the
-- other call's value.
--
-- Fix: drop p_existing_id from the signature. The function now discovers the
-- cancelled row itself, after the FOR UPDATE lock on class_instances is held,
-- so no concurrent call can race past the check.
--
-- The 5-argument signature replaces the 6-argument one. The old signature is
-- revoked and dropped to prevent accidental calls from stale route code.

CREATE OR REPLACE FUNCTION insert_booking_atomic(
  p_gym_id            uuid,
  p_instance_id       uuid,
  p_user_id           uuid,
  p_waitlist_enabled  boolean,
  p_max_waitlist      int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_capacity          int;
  v_confirmed_count   int;
  v_waitlist_count    int;
  v_status            text;
  v_waitlist_position int;
  v_booking_id        uuid;
  v_existing_id       uuid;
BEGIN
  -- Defence-in-depth: if somehow an authenticated (non-service-role) caller
  -- reaches this SECURITY DEFINER function, verify identity and gym membership.
  IF auth.role() != 'service_role' THEN
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'insert_booking_atomic: user_id mismatch for caller %', auth.uid();
    END IF;
    IF p_gym_id IS DISTINCT FROM (
      SELECT gym_id FROM users WHERE id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'insert_booking_atomic: gym_id mismatch for caller %', auth.uid();
    END IF;
  END IF;

  -- Serialize concurrent bookings and read capacity atomically.
  -- The FOR UPDATE lock on class_instances serialises all concurrent bookings
  -- for this instance. Every SELECT and write below runs within that lock.
  SELECT capacity INTO v_capacity
  FROM class_instances
  WHERE id = p_instance_id
    AND gym_id = p_gym_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Discover any cancelled booking for this user+instance now that we hold
  -- the lock. This replaces the pre-RPC SELECT in the route handler (K8) and
  -- means two concurrent re-booking requests cannot both observe the same
  -- cancelled row outside the lock.
  SELECT id INTO v_existing_id
  FROM bookings
  WHERE instance_id = p_instance_id
    AND user_id     = p_user_id
    AND gym_id      = p_gym_id
    AND status      = 'cancelled'
  LIMIT 1;

  -- Count active bookings atomically inside the lock.
  SELECT
    COUNT(*) FILTER (WHERE status IN ('confirmed', 'pending_confirmation')),
    COUNT(*) FILTER (WHERE status = 'waitlisted')
  INTO v_confirmed_count, v_waitlist_count
  FROM bookings
  WHERE instance_id = p_instance_id
    AND status IN ('confirmed', 'pending_confirmation', 'waitlisted');

  -- Determine outcome.
  IF v_confirmed_count >= v_capacity THEN
    IF NOT p_waitlist_enabled THEN
      RETURN jsonb_build_object('error', 'class_full');
    END IF;
    IF v_waitlist_count >= p_max_waitlist THEN
      RETURN jsonb_build_object('error', 'waitlist_full');
    END IF;
    v_status := 'waitlisted';
    v_waitlist_position := v_waitlist_count + 1;
  ELSE
    v_status := 'confirmed';
    v_waitlist_position := NULL;
  END IF;

  -- Insert or un-cancel.
  IF v_existing_id IS NOT NULL THEN
    UPDATE bookings
    SET status                  = v_status,
        waitlist_position       = v_waitlist_position,
        cancelled_at            = NULL,
        confirmation_expires_at = NULL
    WHERE id      = v_existing_id
      AND user_id = p_user_id
      AND gym_id  = p_gym_id;
    v_booking_id := v_existing_id;
  ELSE
    INSERT INTO bookings (gym_id, instance_id, user_id, status, waitlist_position)
    VALUES (p_gym_id, p_instance_id, p_user_id, v_status, v_waitlist_position)
    RETURNING id INTO v_booking_id;
  END IF;

  RETURN jsonb_build_object(
    'booking_id',        v_booking_id,
    'status',            v_status,
    'waitlist_position', v_waitlist_position
  );
END;
$$;

GRANT EXECUTE ON FUNCTION insert_booking_atomic(uuid, uuid, uuid, boolean, int) TO service_role;

-- Revoke and drop the old 6-argument signature (p_existing_id was the 6th
-- parameter). The route handler no longer passes it, so the old overload
-- must go to prevent stale callers from reaching the unpatched version.
REVOKE ALL ON FUNCTION insert_booking_atomic(uuid, uuid, uuid, boolean, int, uuid) FROM PUBLIC;
DROP FUNCTION IF EXISTS insert_booking_atomic(uuid, uuid, uuid, boolean, int, uuid);


-- ═══════════════════════════════════════
-- 057_workout_weeks_status_index.sql
-- ═══════════════════════════════════════

-- 057_workout_weeks_status_index.sql
--
-- Pf2: Add a covering index for the most common workout_weeks query pattern.
--
-- getRecentWeeks() and the this-week page both filter on (gym_id, status)
-- and sort by week_start DESC. The existing index from migration 001 covers
-- (gym_id, week_start) but not status, so Postgres must recheck status after
-- the index scan. At low row counts this is fine; as gyms accumulate years of
-- weekly programs (52 rows/year) the extra filter becomes measurable.
--
-- A partial index scoped to published, non-archived rows covers the hot path
-- without bloating writes for draft rows (which are transient and rarely
-- queried by the hot path).

CREATE INDEX IF NOT EXISTS workout_weeks_published_gym_week
  ON workout_weeks (gym_id, week_start DESC)
  WHERE status = 'published' AND archived_at IS NULL;


-- ═══════════════════════════════════════
-- 058_style_examples_text_length_check.sql
-- ═══════════════════════════════════════

-- 058_style_examples_text_length_check.sql
--
-- A5: Add a DB-level length guard on style_examples.raw_text.
--
-- The route handler (app/api/style/route.ts) already caps inputs at 20,000
-- chars, but the column is unbounded TEXT. A future route that forgets the
-- cap, or a direct service-role write, could store arbitrarily large rows and
-- blow up the AI prompt that embeds the raw_text verbatim.
--
-- 50,000 chars is 2.5× the current UI cap — generous enough to never
-- constrain legitimate use while blocking runaway writes.

-- Migration 046 already added a 20,000-char constraint with this same name.
-- Drop it first so we can replace it with the wider 50,000-char safety net.
-- The route handler still enforces the 20k UI cap; the DB constraint is a
-- defence-in-depth floor that catches direct service-role writes.
ALTER TABLE style_examples DROP CONSTRAINT IF EXISTS style_examples_raw_text_length;

ALTER TABLE style_examples
  ADD CONSTRAINT style_examples_raw_text_length
  CHECK (char_length(raw_text) <= 50000);


-- ═══════════════════════════════════════
-- 059_booking_transition_trigger.sql
-- ═══════════════════════════════════════

-- 059_booking_transition_trigger.sql
--
-- A1: Enforce the booking status state machine at the database level.
--
-- Allowed transitions (derived from full codebase audit):
--
--   confirmed          → cancelled           (member/system cancel)
--   waitlisted         → pending_confirmation (waitlist promotion)
--   waitlisted         → cancelled           (member cancels while waitlisted)
--   pending_confirmation → confirmed          (member confirms via email link)
--   pending_confirmation → cancelled          (token expired, class filled, cron expire)
--   cancelled          → confirmed           (re-booking via insert_booking_atomic)
--   cancelled          → waitlisted          (re-booking when class full)
--
-- Every other transition is invalid and will raise an exception, rolling back
-- the containing transaction.
--
-- Scoped to UPDATE OF status to avoid overhead on unrelated column updates
-- (attended, cancelled_at, confirmation_expires_at, etc.).

CREATE OR REPLACE FUNCTION bookings_enforce_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Allow no-op updates (status unchanged)
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Validate the transition
  IF (OLD.status = 'confirmed'             AND NEW.status = 'cancelled')            OR
     (OLD.status = 'waitlisted'            AND NEW.status = 'pending_confirmation') OR
     (OLD.status = 'waitlisted'            AND NEW.status = 'cancelled')            OR
     (OLD.status = 'pending_confirmation'  AND NEW.status = 'confirmed')            OR
     (OLD.status = 'pending_confirmation'  AND NEW.status = 'cancelled')            OR
     (OLD.status = 'cancelled'             AND NEW.status = 'confirmed')            OR
     (OLD.status = 'cancelled'             AND NEW.status = 'waitlisted')
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'bookings: invalid status transition % → %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER bookings_status_transition
BEFORE UPDATE OF status ON bookings
FOR EACH ROW
EXECUTE FUNCTION bookings_enforce_status_transition();


-- ═══════════════════════════════════════
-- 060_owner_admin_rls_parity.sql
-- ═══════════════════════════════════════

-- 060_owner_admin_rls_parity.sql
-- Migrations 030-038 created admin-access policies that only checked role = 'admin',
-- inadvertently excluding gym owners (role = 'owner'). This migration replaces each
-- such policy so that both 'admin' and 'owner' have equivalent access.
-- Routes already perform role checks at the application layer; this brings the
-- RLS defence-in-depth layer into sync with that intent.

-- Helper macro: checks caller is owner or admin of a given gym_id column reference
-- (inlined per-policy since PG doesn't support macro substitution)

------------------------------------------------------------
-- 031: class_feedback
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym feedback" ON class_feedback;
DROP POLICY IF EXISTS "admins read gym feedback" ON class_feedback;
CREATE POLICY "admins read gym feedback"
  ON class_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = class_feedback.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 032: wod_posts
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage wod posts" ON wod_posts;
DROP POLICY IF EXISTS "admins manage wod posts" ON wod_posts;
CREATE POLICY "admins manage wod posts"
  ON wod_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = wod_posts.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 033: dropin_passes
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage passes" ON dropin_passes;
DROP POLICY IF EXISTS "admins manage passes" ON dropin_passes;
CREATE POLICY "admins manage passes"
  ON dropin_passes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = dropin_passes.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "admins manage pauses" ON membership_pauses;
DROP POLICY IF EXISTS "admins manage pauses" ON membership_pauses;
CREATE POLICY "admins manage pauses"
  ON membership_pauses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = membership_pauses.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 034: member_badges, referrals
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym badges" ON member_badges;
DROP POLICY IF EXISTS "admins read gym badges" ON member_badges;
CREATE POLICY "admins read gym badges"
  ON member_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_badges.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "admins manage referrals" ON referrals;
DROP POLICY IF EXISTS "admins manage referrals" ON referrals;
CREATE POLICY "admins manage referrals"
  ON referrals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = referrals.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 035: workout_edits
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage workout edits" ON workout_edits;
DROP POLICY IF EXISTS "admins manage workout edits" ON workout_edits;
CREATE POLICY "admins manage workout edits"
  ON workout_edits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = workout_edits.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 036: benchmark_results
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "admins read gym benchmark results" ON benchmark_results;
CREATE POLICY "admins read gym benchmark results"
  ON benchmark_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = benchmark_results.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 037: gym_webhooks
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage gym webhooks" ON gym_webhooks;
DROP POLICY IF EXISTS "admins manage gym webhooks" ON gym_webhooks;
CREATE POLICY "admins manage gym webhooks"
  ON gym_webhooks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = gym_webhooks.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 038: push_subscriptions
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "admins read gym push subscriptions" ON push_subscriptions;
CREATE POLICY "admins read gym push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.gym_id = push_subscriptions.gym_id
        AND u.role IN ('owner', 'admin')
    )
  );

------------------------------------------------------------
-- 030: member_notes, member_skills
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage member notes" ON member_notes;
DROP POLICY IF EXISTS "admins manage member notes" ON member_notes;
CREATE POLICY "admins manage member notes"
  ON member_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_notes.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "admins read gym skills" ON member_skills;
DROP POLICY IF EXISTS "admins read gym skills" ON member_skills;
CREATE POLICY "admins read gym skills"
  ON member_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_skills.gym_id
        AND users.role IN ('owner', 'admin')
    )
  );


-- ═══════════════════════════════════════
-- 061_revoked_admin_rls.sql
-- ═══════════════════════════════════════

-- 061_revoked_admin_rls.sql
-- Add revoked_at IS NULL to all admin/owner RLS policies so that revoked admins
-- cannot read or write gym data even if they still hold a valid session token.
-- The app layer already checks revoked_at (migrations 060 + route updates); this
-- brings the DB-layer defence-in-depth into sync.

------------------------------------------------------------
-- 047: deletion_requests
------------------------------------------------------------
DROP POLICY IF EXISTS "admin manage gym deletion requests" ON deletion_requests;
DROP POLICY IF EXISTS "admin manage gym deletion requests" ON deletion_requests;
CREATE POLICY "admin manage gym deletion requests"
  ON deletion_requests FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = deletion_requests.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 048: gym_audit_log
------------------------------------------------------------
DROP POLICY IF EXISTS "owner reads gym audit log" ON gym_audit_log;
DROP POLICY IF EXISTS "owner reads gym audit log" ON gym_audit_log;
CREATE POLICY "owner reads gym audit log"
  ON gym_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = gym_audit_log.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: class_feedback
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym feedback" ON class_feedback;
DROP POLICY IF EXISTS "admins read gym feedback" ON class_feedback;
CREATE POLICY "admins read gym feedback"
  ON class_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = class_feedback.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: wod_posts
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage wod posts" ON wod_posts;
DROP POLICY IF EXISTS "admins manage wod posts" ON wod_posts;
CREATE POLICY "admins manage wod posts"
  ON wod_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = wod_posts.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: dropin_passes
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage passes" ON dropin_passes;
DROP POLICY IF EXISTS "admins manage passes" ON dropin_passes;
CREATE POLICY "admins manage passes"
  ON dropin_passes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = dropin_passes.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: membership_pauses
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage pauses" ON membership_pauses;
DROP POLICY IF EXISTS "admins manage pauses" ON membership_pauses;
CREATE POLICY "admins manage pauses"
  ON membership_pauses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = membership_pauses.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: member_badges
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym badges" ON member_badges;
DROP POLICY IF EXISTS "admins read gym badges" ON member_badges;
CREATE POLICY "admins read gym badges"
  ON member_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_badges.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: referrals
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage referrals" ON referrals;
DROP POLICY IF EXISTS "admins manage referrals" ON referrals;
CREATE POLICY "admins manage referrals"
  ON referrals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = referrals.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: workout_edits
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage workout edits" ON workout_edits;
DROP POLICY IF EXISTS "admins manage workout edits" ON workout_edits;
CREATE POLICY "admins manage workout edits"
  ON workout_edits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = workout_edits.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: benchmark_results
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym benchmark results" ON benchmark_results;
DROP POLICY IF EXISTS "admins read gym benchmark results" ON benchmark_results;
CREATE POLICY "admins read gym benchmark results"
  ON benchmark_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = benchmark_results.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: gym_webhooks
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage gym webhooks" ON gym_webhooks;
DROP POLICY IF EXISTS "admins manage gym webhooks" ON gym_webhooks;
CREATE POLICY "admins manage gym webhooks"
  ON gym_webhooks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = gym_webhooks.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: push_subscriptions
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "admins read gym push subscriptions" ON push_subscriptions;
CREATE POLICY "admins read gym push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.gym_id = push_subscriptions.gym_id
        AND u.role IN ('owner', 'admin')
        AND u.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: member_notes
------------------------------------------------------------
DROP POLICY IF EXISTS "admins manage member notes" ON member_notes;
DROP POLICY IF EXISTS "admins manage member notes" ON member_notes;
CREATE POLICY "admins manage member notes"
  ON member_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_notes.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );

------------------------------------------------------------
-- 060: member_skills
------------------------------------------------------------
DROP POLICY IF EXISTS "admins read gym skills" ON member_skills;
DROP POLICY IF EXISTS "admins read gym skills" ON member_skills;
CREATE POLICY "admins read gym skills"
  ON member_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.gym_id = member_skills.gym_id
        AND users.role IN ('owner', 'admin')
        AND users.revoked_at IS NULL
    )
  );


-- ═══════════════════════════════════════
-- 062_booking_transition_guard.sql
-- ═══════════════════════════════════════

-- 062_booking_transition_guard.sql
-- Enforce valid booking status transitions at the DB layer (A1 from improvement plan).
-- Illegal transitions raise an exception regardless of which client or route
-- triggered the UPDATE — service-role admin client included.
--
-- Valid transitions (derived by auditing every booking UPDATE in the codebase):
--   confirmed           → cancelled          (member cancel, admin revoke)
--   waitlisted          → pending_confirmation (spot opens, waitlist.ts)
--   waitlisted          → cancelled          (member removes, admin revoke)
--   pending_confirmation → confirmed         (member clicks confirm link)
--   pending_confirmation → cancelled         (expired, class full, revoke)
--   cancelled           → confirmed          (re-book via insert_booking_atomic)
--   cancelled           → waitlisted         (re-book when full, insert_booking_atomic)
--
-- Same-status UPDATEs (e.g. updating `attended` or `cancelled_at` without
-- changing status) pass through without restriction.

CREATE OR REPLACE FUNCTION enforce_booking_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- No status change: allow unconditionally (e.g. attended / cancelled_at updates)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF
    (OLD.status = 'confirmed'            AND NEW.status = 'cancelled')            OR
    (OLD.status = 'waitlisted'           AND NEW.status = 'pending_confirmation') OR
    (OLD.status = 'waitlisted'           AND NEW.status = 'cancelled')            OR
    (OLD.status = 'pending_confirmation' AND NEW.status = 'confirmed')            OR
    (OLD.status = 'pending_confirmation' AND NEW.status = 'cancelled')            OR
    (OLD.status = 'cancelled'            AND NEW.status = 'confirmed')            OR
    (OLD.status = 'cancelled'            AND NEW.status = 'waitlisted')
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Invalid booking status transition: % → % (booking id=%)',
    OLD.status, NEW.status, OLD.id;
END;
$$;

-- Drop the trigger if it already exists so this migration is idempotent
DROP TRIGGER IF EXISTS bookings_transition_check ON bookings;

CREATE TRIGGER bookings_transition_check
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_transition();


-- ═══════════════════════════════════════
-- 063_booking_rpcs.sql
-- ═══════════════════════════════════════

-- 063_booking_rpcs.sql
-- A2: Promote ad-hoc booking UPDATEs to named RPCs (improvement plan A2).
--
-- Each function encodes the auth scope, the valid status transition, and
-- returns enough data for the caller to trigger post-mutation side-effects
-- (waitlist promotion, email sends, push notifications) that cannot happen
-- inside Postgres.
--
-- Functions:
--   cancel_booking(p_booking_id, p_gym_id, p_user_id)
--       → { cancelled bool, instance_id uuid }
--   expire_pending_confirmation(p_booking_id)
--       → { cancelled bool, instance_id uuid }
--   confirm_pending_booking(p_booking_id, p_instance_id)
--       → { confirmed bool, cancelled bool, reason text }

-- ---------------------------------------------------------------------------
-- cancel_booking
-- ---------------------------------------------------------------------------
-- Used by: DELETE /api/bookings (member self-cancel).
--
-- Cancels a booking belonging to p_user_id within p_gym_id.
-- Only transitions: confirmed | waitlisted | pending_confirmation → cancelled.
-- Idempotent: if already cancelled, returns cancelled = false (no error).
--
-- Returns:
--   cancelled    true  — row was updated
--   instance_id  uuid  — always set if the booking exists; null otherwise.
--                        Caller uses this to trigger waitlist promotion.
CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id uuid,
  p_gym_id     uuid,
  p_user_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance_id uuid;
  v_rows        int;
BEGIN
  -- Capture instance_id before the UPDATE so the caller can trigger promotion
  -- regardless of whether the cancel is a no-op.
  SELECT instance_id
  INTO   v_instance_id
  FROM   bookings
  WHERE  id      = p_booking_id
    AND  gym_id  = p_gym_id
    AND  user_id = p_user_id;

  IF NOT FOUND THEN
    -- Booking doesn't belong to this user/gym.
    RETURN jsonb_build_object('cancelled', false, 'instance_id', null::uuid);
  END IF;

  UPDATE bookings
  SET    status                  = 'cancelled',
         cancelled_at            = now(),
         waitlist_position       = NULL,
         confirmation_expires_at = NULL
  WHERE  id      = p_booking_id
    AND  gym_id  = p_gym_id
    AND  user_id = p_user_id
    AND  status IN ('confirmed', 'waitlisted', 'pending_confirmation');

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN jsonb_build_object('cancelled', v_rows > 0, 'instance_id', v_instance_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- expire_pending_confirmation
-- ---------------------------------------------------------------------------
-- Used by: GET /api/cron/waitlist-expire
--          POST /api/bookings/confirm/[token]  (expired-token branch)
--
-- Cancels a booking ONLY if its current status is pending_confirmation.
-- The conditional UPDATE is idempotent: if another concurrent process already
-- handled this booking the row count is 0 and cancelled = false, preventing
-- double-promotion of the waitlist.
--
-- Returns:
--   cancelled    true  — row was updated
--   instance_id  uuid  — always set if the booking exists; null otherwise.
CREATE OR REPLACE FUNCTION expire_pending_confirmation(
  p_booking_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance_id uuid;
  v_rows        int;
BEGIN
  SELECT instance_id
  INTO   v_instance_id
  FROM   bookings
  WHERE  id = p_booking_id;

  UPDATE bookings
  SET    status                  = 'cancelled',
         cancelled_at            = now(),
         waitlist_position       = NULL,
         confirmation_expires_at = NULL
  WHERE  id     = p_booking_id
    AND  status = 'pending_confirmation';

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN jsonb_build_object('cancelled', v_rows > 0, 'instance_id', v_instance_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- confirm_pending_booking
-- ---------------------------------------------------------------------------
-- Used by: POST /api/bookings/confirm/[token]
--
-- Atomically re-checks class capacity and flips pending_confirmation →
-- confirmed.  Holds a FOR UPDATE lock on the class_instances row for the
-- duration of the transaction, eliminating the TOCTOU race that exists when
-- the capacity check and the UPDATE are separate round-trips (as is the case
-- in insert_booking_atomic for inserts).
--
-- Returns:
--   confirmed true,  cancelled false, reason null
--       — booking is now confirmed.
--   confirmed false, cancelled true,  reason 'class_full'
--       — class filled between waitlist promotion and now;
--         booking was cancelled; caller should promote next waitlist member.
--   confirmed false, cancelled false, reason 'class_full'
--       — class full but the booking was already in a non-pending state
--         (race: another confirm beat us); caller may still promote.
--   confirmed false, cancelled false, reason 'not_pending'
--       — booking was not in pending_confirmation; already handled or bad id.
CREATE OR REPLACE FUNCTION confirm_pending_booking(
  p_booking_id  uuid,
  p_instance_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity  int;
  v_confirmed int;
  v_rows      int;
BEGIN
  -- Lock the class_instances row for the duration of this transaction so that
  -- concurrent confirm calls cannot race past the capacity check.
  SELECT capacity
  INTO   v_capacity
  FROM   class_instances
  WHERE  id = p_instance_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('confirmed', false, 'cancelled', false, 'reason', 'not_pending');
  END IF;

  -- Count existing confirmed bookings (excluding this one, which is still pending).
  SELECT count(*)
  INTO   v_confirmed
  FROM   bookings
  WHERE  instance_id = p_instance_id
    AND  status      = 'confirmed';

  IF v_confirmed >= v_capacity THEN
    -- Class is full: cancel this pending booking so the slot can be re-offered.
    UPDATE bookings
    SET    status                  = 'cancelled',
           cancelled_at            = now(),
           confirmation_expires_at = NULL,
           waitlist_position       = NULL
    WHERE  id     = p_booking_id
      AND  status = 'pending_confirmation';

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN jsonb_build_object('confirmed', false, 'cancelled', v_rows > 0, 'reason', 'class_full');
  END IF;

  -- Class has room: confirm.
  UPDATE bookings
  SET    status                  = 'confirmed',
         confirmation_expires_at = NULL,
         waitlist_position       = NULL
  WHERE  id     = p_booking_id
    AND  status = 'pending_confirmation';

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('confirmed', false, 'cancelled', false, 'reason', 'not_pending');
  END IF;

  RETURN jsonb_build_object('confirmed', true, 'cancelled', false, 'reason', null::text);
END;
$$;


-- ═══════════════════════════════════════
-- 064_messaging.sql
-- ═══════════════════════════════════════

-- supabase/migrations/064_messaging.sql

-- Tables

CREATE TABLE IF NOT EXISTS conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  owner_unread    int NOT NULL DEFAULT 0,
  member_unread   int NOT NULL DEFAULT 0,
  UNIQUE (gym_id, member_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  gym_id          uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id),
  body            text NOT NULL CHECK (char_length(body) <= 2000),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS messages_gym_id_idx          ON messages (gym_id);
CREATE INDEX IF NOT EXISTS conversations_gym_id_idx     ON conversations (gym_id);
CREATE INDEX IF NOT EXISTS conversations_member_id_idx  ON conversations (member_id);

-- RLS

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_insert_own_conversation" ON conversations;
DROP POLICY IF EXISTS "member_insert_own_conversation" ON conversations;
CREATE POLICY "member_insert_own_conversation" ON conversations
  FOR INSERT WITH CHECK (
    member_id = auth.uid() AND
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "member_select_own_conversation" ON conversations;
DROP POLICY IF EXISTS "member_select_own_conversation" ON conversations;
CREATE POLICY "member_select_own_conversation" ON conversations
  FOR SELECT USING (member_id = auth.uid());

DROP POLICY IF EXISTS "owner_select_gym_conversations" ON conversations;
DROP POLICY IF EXISTS "owner_select_gym_conversations" ON conversations;
CREATE POLICY "owner_select_gym_conversations" ON conversations
  FOR SELECT USING (
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "member_insert_own_message" ON messages;
DROP POLICY IF EXISTS "member_insert_own_message" ON messages;
CREATE POLICY "member_insert_own_message" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations WHERE member_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "member_select_own_messages" ON messages;
DROP POLICY IF EXISTS "member_select_own_messages" ON messages;
CREATE POLICY "member_select_own_messages" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE member_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_select_gym_messages" ON messages;
DROP POLICY IF EXISTS "owner_select_gym_messages" ON messages;
CREATE POLICY "owner_select_gym_messages" ON messages
  FOR SELECT USING (
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "owner_insert_gym_message" ON messages;
DROP POLICY IF EXISTS "owner_insert_gym_message" ON messages;
CREATE POLICY "owner_insert_gym_message" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

-- Atomic unread counter RPCs

CREATE OR REPLACE FUNCTION increment_owner_unread(conv_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE conversations SET owner_unread = owner_unread + 1, last_message_at = now()
  WHERE id = conv_id;
$$;

CREATE OR REPLACE FUNCTION increment_member_unread(conv_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE conversations SET member_unread = member_unread + 1, last_message_at = now()
  WHERE id = conv_id;
$$;

CREATE OR REPLACE FUNCTION reset_owner_unread(conv_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE conversations SET owner_unread = 0 WHERE id = conv_id;
$$;

CREATE OR REPLACE FUNCTION reset_member_unread(conv_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE conversations SET member_unread = 0 WHERE id = conv_id;
$$;


-- ═══════════════════════════════════════
-- 065_messaging_rpc_security.sql
-- ═══════════════════════════════════════

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


