// tests/lib/bookings/waitlist.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/email/send', () => ({
  sendWaitlistPromotion: vi.fn(),
  sendBookingConfirmed: vi.fn(),
  sendBookingCancelled: vi.fn(),
}))

import { shouldSkipPromotion, getConfirmationWindow } from '@/lib/bookings/waitlist'

describe('shouldSkipPromotion', () => {
  it('returns true when class starts within 2 hours', () => {
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1h from now
    expect(shouldSkipPromotion(soon)).toBe(true)
  })

  it('returns false when class starts more than 2 hours away', () => {
    const later = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() // 3h from now
    expect(shouldSkipPromotion(later)).toBe(false)
  })
})

describe('getConfirmationWindow', () => {
  it('returns 2 hours when class is far away', () => {
    const later = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
    const window = getConfirmationWindow(later)
    expect(window).toBe(2 * 60 * 60 * 1000)
  })

  it('returns 2-hour cap when class is more than 2 hours away', () => {
    const inThreeHours = new Date(Date.now() + 3 * 60 * 60 * 1000)
    const window = getConfirmationWindow(inThreeHours.toISOString())
    // min(2h, 3h) = 2h exactly
    expect(window).toBe(2 * 60 * 60 * 1000)
  })
})
