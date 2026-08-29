-- Postgres-backed rate limiting, so the AI endpoints work without Upstash.
--
-- Why: lib/rate-limit.ts throws in production when Upstash is unconfigured,
-- deliberately refusing to fail open. Upstash was never configured, so
-- /api/workouts/generate, /api/style, /api/style/generate-samples and
-- /api/workouts/movement-analysis have been returning 500 on every request.
-- The product's core feature has been dead in production, not merely
-- unthrottled.
--
-- Redis is the better tool for this, and the Upstash path is kept as the
-- preferred one in the application. But requiring a second vendor to be
-- provisioned before the main feature works is a fragile arrangement, and the
-- database is already here. This makes Upstash an optimisation rather than a
-- hard dependency.
--
-- Fixed window rather than sliding: a sliding window needs per-request
-- timestamps and a periodic sweep, and for a 10-per-minute limit the extra
-- precision is not worth the write volume.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  identifier   text        NOT NULL,
  preset       text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (identifier, preset, window_start)
);

-- Sweeping old windows needs this; the primary key is not usable for a
-- window_start-only predicate.
CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx
  ON public.rate_limits (window_start);

-- The table lives in the public schema, which is exposed to the Data API, so
-- RLS is required. No policies are defined: nothing but service_role should
-- ever read or write it, and service_role bypasses RLS.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier     text,
  p_preset         text,
  p_limit          integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window_start timestamptz;
  v_count        integer;
BEGIN
  -- Bucket now() down to the start of the current window.
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  -- INSERT .. ON CONFLICT DO UPDATE is atomic, so concurrent requests cannot
  -- both read a stale count and each decide they are under the limit.
  INSERT INTO public.rate_limits (identifier, preset, window_start, count)
  VALUES (p_identifier, p_preset, v_window_start, 1)
  ON CONFLICT (identifier, preset, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;

  -- Opportunistic sweep, roughly 1 call in 100, so old windows do not
  -- accumulate. Cheaper than a scheduled job for a table this small.
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits
     WHERE window_start < now() - interval '2 hours';
  END IF;

  RETURN jsonb_build_object(
    'limited', v_count > p_limit,
    'count',   v_count,
    'reset',   (extract(epoch FROM v_window_start) + p_window_seconds) * 1000
  );
END;
$$;

-- Only the server may call this. Leaving it callable by anon would let anyone
-- burn another gym's quota by calling the RPC directly with their identifier.
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer)
  TO service_role;
