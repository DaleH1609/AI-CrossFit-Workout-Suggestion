-- 020_ai_spend_limit.sql
--
-- Adds per-gym monthly AI call tracking to enforce a spend ceiling.
-- ai_month stores the billing month as YYYY-MM; when the month rolls over
-- the application resets ai_calls_this_month to 1 atomically on first call.

ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS ai_calls_this_month int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_month text NOT NULL DEFAULT '';
