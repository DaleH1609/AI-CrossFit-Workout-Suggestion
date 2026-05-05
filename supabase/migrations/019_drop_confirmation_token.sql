-- 019_drop_confirmation_token.sql
--
-- The confirmation_token column was retained "for audit" after the HMAC-signed
-- token migration (017), but it is now nulled on every confirm/cancel/expire
-- path and never read as an authority. Keeping it around is a defence-in-depth
-- gap (an old UUID-based lookup could be reintroduced accidentally).
--
-- The audit trail is preserved: cancelled_at, confirmation_expires_at, and
-- status transitions provide all the forensic information needed.

ALTER TABLE bookings DROP COLUMN IF EXISTS confirmation_token;
