// tests/lib/crypto/token.test.ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'

// Set the secret before importing the module under test. `getSecret()` reads
// from env at call time, so we can keep the same import across test cases.
beforeAll(() => {
  process.env.BOOKING_TOKEN_SECRET = 'test-secret-for-hmac-at-least-16-chars'
})

// Import after env is set, not at module top-level, so the first call to
// getSecret() sees our test value.
async function importTokenModule() {
  return await import('@/lib/crypto/token')
}

describe('signToken / verifyToken', () => {
  let signToken: typeof import('@/lib/crypto/token').signToken
  let verifyToken: typeof import('@/lib/crypto/token').verifyToken

  beforeEach(async () => {
    const mod = await importTokenModule()
    signToken = mod.signToken
    verifyToken = mod.verifyToken
  })

  it('round-trips a valid token', () => {
    const bookingId = '8f14e45f-ceea-467a-a8b2-2d6b0b0ab4f1'
    const expiresAtMs = Date.now() + 60_000
    const token = signToken(bookingId, expiresAtMs)
    const verified = verifyToken(token)
    expect(verified).not.toBeNull()
    expect(verified?.bookingId).toBe(bookingId)
    expect(verified?.expiresAtMs).toBe(expiresAtMs)
  })

  it('produces a three-part v1-prefixed token', () => {
    const token = signToken('booking-1', Date.now() + 60_000)
    const parts = token.split('.')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBe('v1')
    // base64url alphabet only — no +, /, or = padding
    expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(parts[2]).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('rejects a token with a tampered payload', () => {
    const original = signToken('booking-1', Date.now() + 60_000)
    const forgedPayload = Buffer.from(
      JSON.stringify({ b: 'booking-evil', e: Date.now() + 60_000 }),
      'utf8',
    )
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const [, , sig] = original.split('.')
    const tampered = `v1.${forgedPayload}.${sig}`
    expect(verifyToken(tampered)).toBeNull()
  })

  it('rejects a token with a tampered signature', () => {
    const token = signToken('booking-1', Date.now() + 60_000)
    const [version, payload] = token.split('.')
    // Swap signature for a same-length string of the right charset
    const fakeSig = 'A'.repeat(token.split('.')[2].length)
    expect(verifyToken(`${version}.${payload}.${fakeSig}`)).toBeNull()
  })

  it('rejects an expired token', () => {
    const token = signToken('booking-1', Date.now() - 1_000)
    expect(verifyToken(token)).toBeNull()
  })

  it('rejects tokens without three parts', () => {
    expect(verifyToken('not-a-token')).toBeNull()
    expect(verifyToken('v1.onlyonedot')).toBeNull()
    expect(verifyToken('v1.too.many.dots')).toBeNull()
  })

  it('rejects tokens with a non-v1 version prefix', () => {
    const token = signToken('booking-1', Date.now() + 60_000)
    const [, payload, sig] = token.split('.')
    expect(verifyToken(`v2.${payload}.${sig}`)).toBeNull()
  })

  it('rejects tokens whose payload cannot be JSON-parsed', async () => {
    // Craft a token with a validly-signed payload that isn't valid JSON —
    // i.e. we pass the signature check but fail at JSON.parse.
    const { createHmac } = await import('crypto')
    const secret = process.env.BOOKING_TOKEN_SECRET!
    const nonJson = 'this is not json at all'
    const encoded = Buffer.from(nonJson, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const sig = createHmac('sha256', secret)
      .update(`v1.${encoded}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(verifyToken(`v1.${encoded}.${sig}`)).toBeNull()
  })

  it('rejects tokens whose payload decodes to bad shapes', () => {
    // Sign a payload that parses as JSON but doesn't match our schema
    const secret = process.env.BOOKING_TOKEN_SECRET!
    const { createHmac } = require('crypto')
    const badPayload = JSON.stringify({ b: 42, e: 'not a number' })
    const encoded = Buffer.from(badPayload, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const sig = createHmac('sha256', secret)
      .update(`v1.${encoded}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const forged = `v1.${encoded}.${sig}`
    expect(verifyToken(forged)).toBeNull()
  })

  it('rejects non-string inputs', () => {
    // Callers might pass `undefined` from optional route params
    expect(verifyToken(undefined as unknown as string)).toBeNull()
    expect(verifyToken(null as unknown as string)).toBeNull()
    expect(verifyToken(42 as unknown as string)).toBeNull()
  })
})

describe('signToken secret requirements', () => {
  // getSecret() reads process.env on every call, so we can mutate the env
  // between cases without re-importing the module.
  it('throws when BOOKING_TOKEN_SECRET is missing', async () => {
    const saved = process.env.BOOKING_TOKEN_SECRET
    delete process.env.BOOKING_TOKEN_SECRET
    const mod = await importTokenModule()
    expect(() => mod.signToken('booking-1', Date.now() + 1_000)).toThrow(/BOOKING_TOKEN_SECRET/)
    process.env.BOOKING_TOKEN_SECRET = saved
  })

  it('throws when BOOKING_TOKEN_SECRET is shorter than 16 chars', async () => {
    const saved = process.env.BOOKING_TOKEN_SECRET
    process.env.BOOKING_TOKEN_SECRET = 'short'
    const mod = await importTokenModule()
    expect(() => mod.signToken('booking-1', Date.now() + 1_000)).toThrow(/at least 16/)
    process.env.BOOKING_TOKEN_SECRET = saved
  })
})
