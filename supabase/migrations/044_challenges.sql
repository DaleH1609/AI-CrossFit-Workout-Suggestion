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
create policy "gym members read active challenges" on monthly_challenges
  for select using (
    gym_id in (select gym_id from users where id = auth.uid())
    and active = true
  );

create policy "admins manage challenges" on monthly_challenges
  for all using (
    gym_id in (select gym_id from users where id = auth.uid() and role in ('owner','admin'))
  );

-- Entries: members read/insert own; admins read all in their gym
create policy "members manage own entries" on challenge_entries
  for all using (user_id = auth.uid());

create policy "admins read gym entries" on challenge_entries
  for select using (
    gym_id in (select gym_id from users where id = auth.uid() and role in ('owner','admin','coach'))
  );
