// tests/lib/checkin.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { generateCheckinCode, verifyCheckinCode } from '@/lib/checkin'

/**
 * Check-in codes are what stand between "attended" being a record of who
 * turned up and a number anyone can type. getSecret() reads env at call time,
 * so setting it in beforeAll is enough — no dynamic import needed.
 */
beforeAll(() => {
  process.env.BOOKING_TOKEN_SECRET = 'test-secret-for-hmac-at-least-16-chars'
})

const WINDOW_MS = 30 * 60 * 1000
const INSTANCE = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'

// Pinned to a slot boundary so "same window" and "next window" are exact
// rather than dependent on when the suite happens to run.
const SLOT_START = Math.floor(Date.parse('2026-08-24T09:00:00.000Z') / WINDOW_MS) * WINDOW_MS

describe('generateCheckinCode', () => {
  it('always returns exactly six digits', () => {
    // The modulo can produce a small number; without zero-padding the UI would
    // render a four-digit code that never matches on the way back in.
    for (let i = 0; i < 200; i++) {
      const code = generateCheckinCode(`instance-${i}`, SLOT_START)
      expect(code, `instance-${i}`).toMatch(/^\d{6}$/)
    }
  })

  it('is deterministic within a window', () => {
    const a = generateCheckinCode(INSTANCE, SLOT_START)
    const b = generateCheckinCode(INSTANCE, SLOT_START + WINDOW_MS - 1)
    expect(b).toBe(a)
  })

  it('rotates at the window boundary', () => {
    const inWindow = generateCheckinCode(INSTANCE, SLOT_START)
    const nextWindow = generateCheckinCode(INSTANCE, SLOT_START + WINDOW_MS)
    expect(nextWindow).not.toBe(inWindow)
  })

  it('gives different codes to different classes at the same moment', () => {
    // Otherwise one member's code checks them into every class running.
    expect(generateCheckinCode(OTHER, SLOT_START))
      .not.toBe(generateCheckinCode(INSTANCE, SLOT_START))
  })
})

describe('verifyCheckinCode', () => {
  it('accepts the code for the current window', () => {
    expect(verifyCheckinCode(INSTANCE, generateCheckinCode(INSTANCE, Date.now()))).toBe(true)
  })

  it('accepts the previous window, so a code entered as it rotates still works', () => {
    // The grace window is deliberate: a member reading the code off a screen
    // as it changes should not be rejected.
    const previous = generateCheckinCode(INSTANCE, Date.now() - WINDOW_MS)
    expect(verifyCheckinCode(INSTANCE, previous)).toBe(true)
  })

  it('rejects a code from two windows ago', () => {
    // The grace window must not become an open door. Skipped when the older
    // code happens to collide with an accepted one — a 1-in-a-million digit
    // collision is not a failure of the logic under test.
    const stale = generateCheckinCode(INSTANCE, Date.now() - 2 * WINDOW_MS)
    const accepted = new Set([
      generateCheckinCode(INSTANCE, Date.now()),
      generateCheckinCode(INSTANCE, Date.now() - WINDOW_MS),
    ])
    if (!accepted.has(stale)) expect(verifyCheckinCode(INSTANCE, stale)).toBe(false)
  })

  it("rejects another class's current code", () => {
    const others = generateCheckinCode(OTHER, Date.now())
    const accepted = new Set([
      generateCheckinCode(INSTANCE, Date.now()),
      generateCheckinCode(INSTANCE, Date.now() - WINDOW_MS),
    ])
    if (!accepted.has(others)) expect(verifyCheckinCode(INSTANCE, others)).toBe(false)
  })

  it('rejects empty and malformed input', () => {
    expect(verifyCheckinCode(INSTANCE, '')).toBe(false)
    expect(verifyCheckinCode(INSTANCE, '12345')).toBe(false)
    expect(verifyCheckinCode(INSTANCE, 'abcdef')).toBe(false)
  })
})
