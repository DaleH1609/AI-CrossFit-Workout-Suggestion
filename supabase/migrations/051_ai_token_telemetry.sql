-- migration 051: token-level AI usage telemetry (O2)
-- Tracks actual input/output tokens per month alongside the call count,
-- enabling real cost attribution per gym before pricing is introduced.
-- Existing call-count columns are kept for backwards compatibility.

ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS ai_input_tokens_this_month  bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_output_tokens_this_month bigint NOT NULL DEFAULT 0;
