// tests/lib/rate-limit.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * This module memoises the Redis client and its limiters at module scope, so
 * every case resets the module registry and re-imports rather than sharing
 * state. Env is restored afterwards because vitest shares process.env.
 *
 * The behaviour worth protecting is the last one: with no backend reachable it
 * must throw in production rather than wave requests through. That refusal is
 * why the AI endpoints returned 500 when Upstash was never provisioned — the
 * fix was to add the Postgres fallback, not to soften this.
 */

const limitMock = vi.fn()
const rpcMock = vi.fn()

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = () => ({})
    limit = (...args: unknown[]) => limitMock(...args)
  },
}))
vi.mock('@upstash/redis', () => ({ Redis: class {} }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: rpcMock }) }))

const ENV_KEYS = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'VERCEL_ENV'] as const
let saved: Record<string, string | undefined> = {}

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]]))
  for (const k of ENV_KEYS) delete process.env[k]
  limitMock.mockReset()
  rpcMock.mockReset()
  vi.resetModules()
})

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

async function load() {
  return (await import('@/lib/rate-limit')).rateLimit
}

function withUpstash() {
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
}

describe('rateLimit — Upstash path', () => {
  it('allows a request Upstash accepts, and never queries Postgres', async () => {
    withUpstash()
    limitMock.mockResolvedValue({ success: true, reset: 123 })
    const rateLimit = await load()
    expect(await rateLimit('gym-1', 'ai')).toEqual({ limited: false, reset: undefined })
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('reports the reset time only when it actually limits', async () => {
    withUpstash()
    limitMock.mockResolvedValue({ success: false, reset: 999 })
    const rateLimit = await load()
    expect(await rateLimit('gym-1', 'ai')).toEqual({ limited: true, reset: 999 })
  })
})

describe('rateLimit — Postgres fallback', () => {
  it('falls back when Upstash is unconfigured', async () => {
    rpcMock.mockResolvedValue({ data: { limited: false, reset: 0 }, error: null })
    const rateLimit = await load()
    expect(await rateLimit('gym-1', 'ai')).toEqual({ limited: false, reset: undefined })
    expect(rpcMock).toHaveBeenCalledTimes(1)
  })

  it('passes each preset’s documented limit and window', async () => {
    // 'ai' is 10/minute and 'signup' 5/hour. Sending the wrong window to the
    // RPC would silently widen or narrow the limit with nothing to notice it.
    rpcMock.mockResolvedValue({ data: { limited: false, reset: 0 }, error: null })
    const rateLimit = await load()

    await rateLimit('gym-1', 'ai')
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_limit: 10, p_window_seconds: 60 })

    await rateLimit('ip-1', 'signup')
    expect(rpcMock.mock.calls[1][1]).toMatchObject({ p_limit: 5, p_window_seconds: 3600 })
  })

  it('surfaces a limit from Postgres with its reset', async () => {
    rpcMock.mockResolvedValue({ data: { limited: true, reset: 4242 }, error: null })
    const rateLimit = await load()
    expect(await rateLimit('gym-1', 'ai')).toEqual({ limited: true, reset: 4242 })
  })
})

describe('rateLimit — when no backend is reachable', () => {
  it('refuses to fail open in production', async () => {
    // The important one. Failing open here leaves paid AI endpoints unprotected,
    // so a throw the caller turns into a 500 is the intended outcome.
    process.env.VERCEL_ENV = 'production'
    rpcMock.mockResolvedValue({ data: null, error: new Error('no database') })
    const rateLimit = await load()
    await expect(rateLimit('gym-1', 'ai')).rejects.toThrow(/refusing to fail open/)
  })

  it('fails open outside production so local work needs no configuration', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('no database') })
    const rateLimit = await load()
    expect(await rateLimit('gym-1', 'ai')).toEqual({ limited: false })
  })
})
