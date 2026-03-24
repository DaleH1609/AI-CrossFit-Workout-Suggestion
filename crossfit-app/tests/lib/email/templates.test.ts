// tests/lib/email/templates.test.ts
import { describe, it, expect } from 'vitest'
import {
  bookingConfirmedHtml,
  waitlistPromotionHtml,
  workoutsPublishedHtml,
  memberInvitedHtml,
  bookingCancelledHtml,
} from '@/lib/email/templates'

describe('email templates', () => {
  it('bookingConfirmedHtml includes name, date, time', () => {
    const html = bookingConfirmedHtml('Alice', 'Monday March 25', '6:00am')
    expect(html).toContain('Alice')
    expect(html).toContain('Monday March 25')
    expect(html).toContain('6:00am')
    expect(html).toContain('Booking Confirmed')
  })

  it('waitlistPromotionHtml includes confirm link', () => {
    const html = waitlistPromotionHtml('Bob', 'Tuesday', '9:00am', 'https://example.com/confirm/abc', '2 hours')
    expect(html).toContain('Bob')
    expect(html).toContain('https://example.com/confirm/abc')
    expect(html).toContain('2 hours')
    expect(html).toContain('Confirm My Spot')
  })

  it('workoutsPublishedHtml includes gym name', () => {
    const html = workoutsPublishedHtml('Iron City CrossFit')
    expect(html).toContain('Iron City CrossFit')
    expect(html).toContain('Workouts Are Live')
  })

  it('memberInvitedHtml includes gym name and invite URL', () => {
    const html = memberInvitedHtml('CrossFit Gym', 'https://example.com/invite/xyz')
    expect(html).toContain('CrossFit Gym')
    expect(html).toContain('https://example.com/invite/xyz')
    expect(html).toContain('Accept Invite')
  })

  it('bookingCancelledHtml includes name, date, time', () => {
    const html = bookingCancelledHtml('Carol', 'Wednesday', '5:00pm')
    expect(html).toContain('Carol')
    expect(html).toContain('Wednesday')
    expect(html).toContain('5:00pm')
    expect(html).toContain('Booking Cancelled')
  })
})
