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
CREATE POLICY "member insert own deletion request" ON deletion_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "member read own deletion request" ON deletion_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Owners/admins can read and update requests for their gym
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
