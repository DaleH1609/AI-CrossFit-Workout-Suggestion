create table specialty_programs (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references gyms(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  week_start  date not null,
  days        jsonb not null default '[]',
  status      text not null default 'draft' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(gym_id, name, week_start)
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger specialty_programs_updated_at
  before update on specialty_programs
  for each row execute function set_updated_at();

alter table specialty_programs enable row level security;

create policy "owners manage own gym programs"
  on specialty_programs for all
  using (user_role() = 'owner' and gym_id = current_gym_id())
  with check (user_role() = 'owner' and gym_id = current_gym_id());

create policy "members read published programs"
  on specialty_programs for select
  using (
    status = 'published'
    and gym_id = current_gym_id()
  );

create index on specialty_programs(gym_id, week_start, status);
