-- 017_confirmation_token_text.sql
--
-- Widen bookings.confirmation_token from `uuid` to `text` to accommodate the
-- HMAC-signed token format introduced in lib/crypto/token.ts
-- (v1.{base64url(payload)}.{base64url(signature)}).
--
-- Before this change, `signToken()` produced strings like
--   v1.eyJiIjoiYm9va2luZy0xIiwiZSI6MTcxNTAwMDAwMDAwMH0.Yn4K...
-- which Postgres rejects with "invalid input syntax for type uuid" when the
-- waitlist promotion path writes them to the column. That would break the
-- confirmation flow the very first time a class fills up post-deploy.
--
-- Legacy values in this column (from before the signed-token rollout) are
-- UUIDs and will cast cleanly to text. Any in-flight pending confirmations
-- remain valid — the `/api/bookings/confirm/[token]` route still has a
-- UUID-shaped fallback branch that looks them up by equality.
--
-- The partial unique index must be rebuilt because the column type changes.
-- Postgres auto-drops the index during ALTER TYPE, but we recreate it
-- explicitly so the migration is self-documenting.

----------------------------------------------------------------------
-- 1. Drop dependent indexes (Postgres requires this before ALTER TYPE)
----------------------------------------------------------------------
drop index if exists bookings_confirmation_token_key;          -- from `unique` constraint
drop index if exists bookings_confirmation_token_idx;          -- partial index name from 001

-- 001_schema.sql used implicit index names; look them up defensively.
do $$
declare
  r record;
begin
  for r in
    select indexname from pg_indexes
    where schemaname = 'public'
      and tablename = 'bookings'
      and indexdef ilike '%confirmation_token%'
  loop
    execute format('drop index if exists %I', r.indexname);
  end loop;
end $$;

-- Drop the unique constraint (if it was created as a constraint rather than
-- just a unique index). Safe if it doesn't exist.
alter table bookings drop constraint if exists bookings_confirmation_token_key;

----------------------------------------------------------------------
-- 2. Widen the column
----------------------------------------------------------------------
alter table bookings
  alter column confirmation_token type text using confirmation_token::text;

----------------------------------------------------------------------
-- 3. Re-create the indexes on the new type
----------------------------------------------------------------------
-- Unique per-token lookup (only when non-null; cancelled/confirmed rows clear it).
create unique index if not exists bookings_confirmation_token_key
  on bookings(confirmation_token)
  where confirmation_token is not null;

-- Hot lookup path used by the confirm route and waitlist-expire cron.
create index if not exists bookings_confirmation_token_idx
  on bookings(confirmation_token)
  where confirmation_token is not null;
