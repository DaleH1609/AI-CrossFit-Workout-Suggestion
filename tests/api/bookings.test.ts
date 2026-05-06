// tests/api/bookings.test.ts
import { describe, it, expect } from 'vitest'
import { BOOKING_ADVANCE_DAYS, getMondayOfCurrentWeek } from '@/lib/utils'

const ADVANCE_MS = BOOKING_ADVANCE_DAYS * 24 * 60 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000

// Inline booking window logic (mirrors route.ts)
function isBookingWindowOpen(startsAt: string): boolean {
  return new Date(startsAt).getTime() <= Date.now() + ADVANCE_MS
}

// Inline cancellation cutoff logic (mirrors route.ts)
function canCancel(startsAt: string): boolean {
  return Date.now() <= new Date(startsAt).getTime() - ONE_HOUR_MS
}

describe('BOOKING_ADVANCE_DAYS', () => {
  it('is a number', () => {
    expect(typeof BOOKING_ADVANCE_DAYS).toBe('number')
  })
  it('equals 2', () => {
    expect(BOOKING_ADVANCE_DAYS).toBe(2)
  })
})

describe('booking advance window', () => {
  it('is open for a class starting in 1 day', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    expect(isBookingWindowOpen(tomorrow)).toBe(true)
  })

  it('is open for a class starting in exactly BOOKING_ADVANCE_DAYS days', () => {
    const atWindow = new Date(Date.now() + ADVANCE_MS).toISOString()
    expect(isBookingWindowOpen(atWindow)).toBe(true)
  })

  it('is NOT open for a class starting more than BOOKING_ADVANCE_DAYS days from now', () => {
    const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(isBookingWindowOpen(threeDays)).toBe(false)
  })
})

// NOTE (R9): the "waitlist status logic" tests were removed — they tested
// inline JavaScript ternary expressions, not the actual RPC or route handler,
// and would not have caught R1 (the broken confirmed-status UPDATE after
// migration 022 narrowed member RLS). Real coverage requires a DB integration
// test harness (Postgres container + migrations + fetch(handler)); see
// docs/security-review-2026-05-05-r3.md for the suggested test plan.

describe('cancellation cutoff', () => {
  it('allows cancellation more than 1 hour before class', () => {
    const twoHours = new Date(Date.now() + 2 * ONE_HOUR_MS).toISOString()
    expect(canCancel(twoHours)).toBe(true)
  })

  it('blocks cancellation within 1 hour of class', () => {
    const thirtyMin = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    expect(canCancel(thirtyMin)).toBe(false)
  })

  it('blocks cancellation for a class in the past', () => {
    const pastClass = new Date(Date.now() - ONE_HOUR_MS).toISOString()
    expect(canCancel(pastClass)).toBe(false)
  })

  // Documents route.ts:156 logic: `Date.now() > starts_at - cutoffMs` means
  // "we're inside the cutoff window (or past class start)" → block. The
  // original review flagged this as inverted; it is not.
  it('blocks cancellation at exactly class start time', () => {
    const atStart = new Date(Date.now()).toISOString()
    expect(canCancel(atStart)).toBe(false)
  })
})

describe('double-book prevention', () => {
  // Mirrors the app/api/bookings/route.ts POST guard:
  // "Another non-cancelled booking exists at the same starts_at (different
  //  instance)" → refuse.
  type Booking = { status: string; instance_id: string; starts_at: string }
  function hasConflict(existing: Booking[], newInstanceId: string, newStartsAt: string) {
    return existing.some(
      b =>
        ['confirmed', 'pending_confirmation', 'waitlisted'].includes(b.status) &&
        b.instance_id !== newInstanceId &&
        b.starts_at === newStartsAt
    )
  }

  it('blocks a second confirmed booking at the exact same start time', () => {
    const starts = '2026-05-01T09:00:00.000Z'
    const existing = [{ status: 'confirmed', instance_id: 'x', starts_at: starts }]
    expect(hasConflict(existing, 'y', starts)).toBe(true)
  })

  it('allows booking the same instance (upsert path)', () => {
    const starts = '2026-05-01T09:00:00.000Z'
    const existing = [{ status: 'cancelled', instance_id: 'y', starts_at: starts }]
    // Existing cancelled bookings don't block; handler re-activates them.
    expect(hasConflict(existing, 'y', starts)).toBe(false)
  })

  it('allows different-time class on same day', () => {
    const existing = [{ status: 'confirmed', instance_id: 'x', starts_at: '2026-05-01T09:00:00.000Z' }]
    expect(hasConflict(existing, 'y', '2026-05-01T18:00:00.000Z')).toBe(false)
  })

  it('considers pending_confirmation and waitlisted as conflicts', () => {
    const starts = '2026-05-01T09:00:00.000Z'
    expect(
      hasConflict(
        [{ status: 'pending_confirmation', instance_id: 'x', starts_at: starts }],
        'y',
        starts
      )
    ).toBe(true)
    expect(
      hasConflict([{ status: 'waitlisted', instance_id: 'x', starts_at: starts }], 'y', starts)
    ).toBe(true)
  })
})

describe('invite email normalization', () => {
  function normalize(email: string) {
    return email.trim().toLowerCase()
  }
  it('collapses case variants to the same normalized email', () => {
    expect(normalize('John@Example.com')).toBe(normalize('john@example.com'))
    expect(normalize('  john@example.com  ')).toBe('john@example.com')
  })
})

describe('getMondayOfCurrentWeek', () => {
  it('returns a string matching YYYY-MM-DD format', () => {
    const result = getMondayOfCurrentWeek()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns a Monday', () => {
    const result = getMondayOfCurrentWeek()
    const day = new Date(result + 'T12:00:00Z').getUTCDay() // use UTC noon to avoid timezone edge cases
    expect(day).toBe(1) // 1 = Monday
  })
})
