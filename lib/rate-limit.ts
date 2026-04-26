// lib/rate-limit.ts
//
// Upstash Redis-backed rate limiting. Fails open (allows request) when Redis
// is not configured so the app works in local dev without UPSTASH_* env vars.
//
// Add Upstash via Vercel Marketplace to get the required env vars:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

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

  if (!limiter) {
    // Redis not configured — fail open so dev/preview envs work without Redis
    return { limited: false }
  }

  const { success, reset } = await limiter.limit(identifier)
  return { limited: !success, reset: success ? undefined : reset }
}
