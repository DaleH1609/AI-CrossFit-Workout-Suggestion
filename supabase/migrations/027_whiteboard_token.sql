-- F15: Whiteboard TV mode — stable per-gym display token
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS whiteboard_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS gyms_whiteboard_token_idx ON gyms(whiteboard_token);
