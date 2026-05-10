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

CREATE INDEX gym_audit_log_gym_id_idx ON gym_audit_log (gym_id, created_at DESC);

ALTER TABLE gym_audit_log ENABLE ROW LEVEL SECURITY;

-- Owners and admins can read their gym's log
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
