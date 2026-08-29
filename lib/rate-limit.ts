// lib/rate-limit.ts
//
// Two backends, tried in order:
//
//   1. Upstash Redis, when UPSTASH_REDIS_REST_URL and _TOKEN are set. Purpose
//      built for this, sliding window, no database load.
//   2. Postgres, via the check_rate_limit RPC (migration 069). Fixed window,
//      one round trip, no extra vendor.
//
// The Postgres path exists because requiring a second vendor before the
// product's main feature works is fragile: Upstash was never provisioned, and
// because this module correctly refuses to fail open in production, every AI
// endpoint returned 500 rather than running unthrottled.
//
// Dev and preview still fail open so local work needs no configuration.

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { createAdminClient } from '@/lib/supabase/admin'

let _redis: Redis | null | undefined = undefined

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    _redis = null
    return null
  }
  _redis = new Redis({ url, token })
  return _redis
}

// Lazily-created limiters keyed by preset name
const limiters = new Map<string, Ratelimit>()

type Window = `${number} ${'s' | 'm' | 'h' | 'd'}`

function getLimiter(preset: string, requests: number, window: Window): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  if (!limiters.has(preset)) {
    limiters.set(preset, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix: `rl:${preset}`,
    }))
  }
  return limiters.get(preset)!
}

export interface RateLimitResult {
  limited: boolean
  /** Unix timestamp (ms) when the limit resets — present only when limited */
  reset?: number
}

/**
 * Check rate limit for an identifier (gym ID, user ID, or IP).
 *
 * Presets:
 *   'ai'     — 10 requests / minute  (Anthropic API calls)
 *   'signup' — 5 requests / hour     (unauthenticated account creation)
 */
export async function rateLimit(
  identifier: string,
  preset: 'ai' | 'signup',
): Promise<RateLimitResult> {
  const config: Record<string, { requests: number; window: Window }> = {
    ai:     { requests: 10, window: '1 m' },
    signup: { requests: 5,  window: '1 h' },
  }
  const { requests, window } = config[preset]
  const limiter = getLimiter(preset, requests, window)

  if (limiter) {
    const { success, reset } = await limiter.limit(identifier)
    return { limited: !success, reset: success ? undefined : reset }
  }

  // No Redis. Fall back to Postgres rather than throwing, so the feature works.
  try {
    const windowSeconds = window === '1 h' ? 3600 : 60
    const { data, error } = await createAdminClient().rpc('check_rate_limit' as never, {
      p_identifier:     identifier,
      p_preset:         preset,
      p_limit:          requests,
      p_window_seconds: windowSeconds,
    } as never)

    if (error) throw error
    const result = data as unknown as { limited: boolean; reset: number }
    return { limited: result.limited, reset: result.limited ? result.reset : undefined }
  } catch (err) {
    // Both backends unavailable. In production that is still a misconfiguration
    // and failing open would leave paid AI endpoints unprotected, so refuse.
    if (process.env.VERCEL_ENV === 'production') {
      console.error('[rate-limit] no backend available', err)
      throw new Error('[rate-limit] neither Upstash nor Postgres available - refusing to fail open')
    }
    return { limited: false }
  }
}
