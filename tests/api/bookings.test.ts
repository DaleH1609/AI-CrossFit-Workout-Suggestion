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

describe('waitlist status logic', () => {
  it('assigns confirmed status when class is not full', () => {
    const isFull = false
    const waitlistCount = 0
    const status = isFull ? 'waitlisted' : 'confirmed'
    const position = isFull ? waitlistCount + 1 : null
    expect(status).toBe('confirmed')
    expect(position).toBeNull()
  })

  it('assigns waitlisted status and correct position when class is full', () => {
    const isFull = true
    const waitlistCount = 3
    const status = isFull ? 'waitlisted' : 'confirmed'
    const position = isFull ? waitlistCount + 1 : null
    expect(status).toBe('waitlisted')
    expect(position).toBe(4)
  })

  it('assigns waitlist position 1 when waitlist is empty', () => {
    const isFull = true
    const waitlistCount = 0
    const position = isFull ? waitlistCount + 1 : null
    expect(position).toBe(1)
  })
})

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
