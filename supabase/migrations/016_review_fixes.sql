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
