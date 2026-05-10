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
CREATE POLICY "coaches read gym sub_requests" ON sub_requests
  FOR SELECT USING (
    gym_id IN (
      SELECT gym_id FROM users WHERE id = auth.uid()
        AND role IN ('coach', 'admin', 'owner')
    )
  );

-- Only the requesting coach can insert
CREATE POLICY "coach inserts own sub_request" ON sub_requests
  FOR INSERT WITH CHECK (
    requesting_coach_id = auth.uid()
    AND gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid())
  );

-- Requesting coach can cancel; any gym coach can claim (update claimed_by + status)
CREATE POLICY "coaches update sub_requests" ON sub_requests
  FOR UPDATE USING (
    gym_id IN (
      SELECT gym_id FROM users WHERE id = auth.uid()
        AND role IN ('coach', 'admin', 'owner')
    )
  );
