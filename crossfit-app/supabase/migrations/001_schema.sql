-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Gyms
create table gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'UTC',
  owner_id uuid, -- set after users created; FK added below
  created_at timestamptz not null default now()
);

-- Users
create table users (
  id uuid primary key, -- matches Supabase Auth UID
  gym_id uuid not null references gyms(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table gyms add constraint gyms_owner_id_fkey
  foreign key (owner_id) references users(id);

-- Style examples
create table style_examples (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  raw_text text not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- Workout weeks
create table workout_weeks (
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
create table class_slot_templates (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 7),
  local_time time not null,
  capacity int not null default 20,
  active boolean not null default true
);

-- Class instances
create table class_instances (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  template_id uuid references class_slot_templates(id) on delete set null,
  date date not null,
  local_time time not null,
  starts_at timestamptz not null, -- UTC anchor, DST-safe
  capacity int not null default 20
);

-- Bookings
create table bookings (
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
