-- 055_atomic_ai_increment.sql
--
-- K7: Replace the read-modify-write in incrementAiCalls with an atomic UPDATE.
--
-- The old TypeScript implementation did SELECT then UPDATE — under concurrency,
-- two simultaneous AI calls could both read the same count and both increment
-- it, resulting in one "free" call. This function collapses both into a single
-- UPDATE … RETURNING, so the increment is serialised at the database level.
--
-- The function is SECURITY INVOKER so it runs as the calling user and respects
-- their RLS policy (owners can update their own gym row). No privilege
-- elevation is needed here.
--
-- Parameters:
--   p_gym_id       — the gym to update
--   p_month        — current YYYY-MM string (passed from the caller so tests
--                    can inject a fixed month without mocking Date)
--   p_input_tokens — Anthropic input token count (0 if unavailable)
--   p_output_tokens — Anthropic output token count (0 if unavailable)
--
-- Returns: the new ai_calls_this_month value after the increment.

CREATE OR REPLACE FUNCTION increment_ai_calls(
  p_gym_id        uuid,
  p_month         text,
  p_input_tokens  int DEFAULT 0,
  p_output_tokens int DEFAULT 0
) RETURNS int
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE gyms
  SET
    ai_calls_this_month        = CASE
                                    WHEN ai_month = p_month
                                    THEN COALESCE(ai_calls_this_month, 0) + 1
                                    ELSE 1
                                  END,
    ai_month                   = p_month,
    ai_input_tokens_this_month  = CASE
                                    WHEN ai_month = p_month
                                    THEN COALESCE(ai_input_tokens_this_month, 0) + p_input_tokens
                                    ELSE p_input_tokens
                                  END,
    ai_output_tokens_this_month = CASE
                                    WHEN ai_month = p_month
                                    THEN COALESCE(ai_output_tokens_this_month, 0) + p_output_tokens
                                    ELSE p_output_tokens
                                  END
  WHERE id = p_gym_id
  RETURNING ai_calls_this_month;
$$;

GRANT EXECUTE ON FUNCTION increment_ai_calls(uuid, text, int, int) TO authenticated;
