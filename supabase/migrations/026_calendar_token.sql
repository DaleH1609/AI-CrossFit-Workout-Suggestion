-- F8: Calendar export — stable per-user calendar token for .ics feed
ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_token uuid NOT NULL DEFAULT gen_random_uuid();

-- Unique index so we can look up user by token quickly
CREATE UNIQUE INDEX IF NOT EXISTS users_calendar_token_idx ON users(calendar_token);

-- Members can read their own calendar_token
-- (already covered by existing "member reads own profile" SELECT policy)
