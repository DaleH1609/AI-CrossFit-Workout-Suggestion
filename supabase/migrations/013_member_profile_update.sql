-- Allow members to update their own profile (name only in practice)
create policy "member updates own profile" on users
  for update using (id = auth.uid())
  with check (id = auth.uid());
