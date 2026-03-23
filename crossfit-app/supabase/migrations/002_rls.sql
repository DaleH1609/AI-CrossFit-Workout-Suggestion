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
create or replace function current_role()
returns text language sql stable as $$
  select role from users where id = auth.uid()
$$;

-- Gyms: owner can read/update their gym
create policy "owner reads own gym" on gyms
  for select using (id = current_gym_id());
create policy "owner updates own gym" on gyms
  for update using (owner_id = auth.uid());

-- Users: users read members of their gym; owner can insert/update
create policy "users read same gym" on users
  for select using (gym_id = current_gym_id());
create policy "owner manages members" on users
  for all using (current_role() = 'owner' and gym_id = current_gym_id())
  with check (current_role() = 'owner' and gym_id = current_gym_id());

-- Style examples: owner only
create policy "owner manages style examples" on style_examples
  for all using (current_role() = 'owner' and gym_id = current_gym_id())
  with check (current_role() = 'owner' and gym_id = current_gym_id());

-- Workout weeks: owner sees all; members see published only
create policy "owner sees all workout weeks" on workout_weeks
  for select using (current_role() = 'owner' and gym_id = current_gym_id());
create policy "owner manages workout weeks" on workout_weeks
  for all using (current_role() = 'owner' and gym_id = current_gym_id())
  with check (current_role() = 'owner' and gym_id = current_gym_id());
create policy "member sees published workout weeks" on workout_weeks
  for select using (
    current_role() = 'member'
    and gym_id = current_gym_id()
    and status = 'published'
    and archived_at is null
  );

-- Class slot templates: owner manages; members read active
create policy "owner manages templates" on class_slot_templates
  for all using (current_role() = 'owner' and gym_id = current_gym_id())
  with check (current_role() = 'owner' and gym_id = current_gym_id());
create policy "member reads active templates" on class_slot_templates
  for select using (gym_id = current_gym_id() and active = true);

-- Class instances: all gym members read; owner manages
create policy "gym members read instances" on class_instances
  for select using (gym_id = current_gym_id());
create policy "owner manages instances" on class_instances
  for all using (current_role() = 'owner' and gym_id = current_gym_id())
  with check (current_role() = 'owner' and gym_id = current_gym_id());

-- Bookings: members see own; owner sees all in gym
create policy "member sees own bookings" on bookings
  for select using (user_id = auth.uid());
create policy "member manages own bookings" on bookings
  for all using (user_id = auth.uid() and gym_id = current_gym_id())
  with check (user_id = auth.uid() and gym_id = current_gym_id());
create policy "owner sees all bookings" on bookings
  for select using (current_role() = 'owner' and gym_id = current_gym_id());
