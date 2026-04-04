-- Allow gym owners to update bookings in their gym
-- Required for attendance marking (attended column) and other owner operations
create policy "owner updates bookings"
  on bookings
  for update
  using (user_role() = 'owner' and gym_id = current_gym_id())
  with check (gym_id = current_gym_id());
