// tests/lib/bookings/waitlist.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendWaitlistPromotion = vi.fn()
vi.mock('@/lib/email/send', () => ({
  sendWaitlistPromotion: (...args: unknown[]) => sendWaitlistPromotion(...args),
  sendBookingConfirmed: vi.fn(),
  sendBookingCancelled: vi.fn(),
}))

import {
  shouldSkipPromotion,
  getConfirmationWindow,
  promoteNextWaitlistMember,
} from '@/lib/bookings/waitlist'

describe('shouldSkipPromotion', () => {
  it('returns true when class starts within 2 hours', () => {
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    expect(shouldSkipPromotion(soon)).toBe(true)
  })

  it('returns false when class starts more than 2 hours away', () => {
    const later = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    expect(shouldSkipPromotion(later)).toBe(false)
  })
})

describe('getConfirmationWindow', () => {
  it('returns 2 hours when class is far away', () => {
    const later = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
    expect(getConfirmationWindow(later)).toBe(2 * 60 * 60 * 1000)
  })

  it('caps at 2 hours when class is more than 2 hours away', () => {
    const inThreeHours = new Date(Date.now() + 3 * 60 * 60 * 1000)
    expect(getConfirmationWindow(inThreeHours.toISOString())).toBe(2 * 60 * 60 * 1000)
  })
})

/**
 * Fake Supabase client factory for the table-query builder pattern used by
 * `promoteNextWaitlistMember`. Configurable so each test can simulate a
 * different DB response (including the critical "someone else already claimed
 * this row" case).
 */
interface FakeConfig {
  nextWaitlisted: { id: string; user_id: string; users: { email: string; name: string } } | null
  updateRowsAffected: number
  updateError?: unknown
}

function makeFakeSupabase(cfg: FakeConfig) {
  const update = vi.fn()
  const select = vi.fn()

  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: cfg.nextWaitlisted }),
              }),
            }),
          }),
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        update(payload)
        return {
          eq: () => ({
            eq: () => ({
              select: () => {
                select()
                return Promise.resolve({
                  data: cfg.updateError
                    ? null
                    : Array.from({ length: cfg.updateRowsAffected }, (_, i) => ({ id: `row-${i}` })),
                  error: cfg.updateError ?? null,
                })
              },
            }),
          }),
        }
      },
    }),
  }

  return { client, update, select }
}

describe('promoteNextWaitlistMember', () => {
  const farFuture = () => new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()

  beforeEach(() => {
    process.env.BOOKING_TOKEN_SECRET = 'test-secret-at-least-16-chars'
    sendWaitlistPromotion.mockReset()
    sendWaitlistPromotion.mockResolvedValue(undefined)
  })

  it('skips promotion when class is within 2 hours', async () => {
    const tooSoon = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const { client, update } = makeFakeSupabase({ nextWaitlisted: null, updateRowsAffected: 0 })

    const result = await promoteNextWaitlistMember(client, 'inst-1', tooSoon, 'https://app.test')

    expect(result).toEqual({ promoted: false, reason: 'too-close' })
    expect(update).not.toHaveBeenCalled()
    expect(sendWaitlistPromotion).not.toHaveBeenCalled()
  })

  it('returns no-waitlist when nobody is waitlisted', async () => {
    const { client, update } = makeFakeSupabase({ nextWaitlisted: null, updateRowsAffected: 0 })

    const result = await promoteNextWaitlistMember(client, 'inst-1', farFuture(), 'https://app.test')

    expect(result).toEqual({ promoted: false, reason: 'no-waitlist' })
    expect(update).not.toHaveBeenCalled()
  })

  it('promotes and emails the next waitlisted member', async () => {
    const { client, update } = makeFakeSupabase({
      nextWaitlisted: { id: 'b1', user_id: 'u1', users: { email: 'a@b.co', name: 'Ada' } },
      updateRowsAffected: 1,
    })

    const result = await promoteNextWaitlistMember(client, 'inst-1', farFuture(), 'https://app.test')

    expect(result.promoted).toBe(true)
    expect(result.bookingId).toBe('b1')
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending_confirmation',
        confirmation_expires_at: expect.any(String),
      })
    )
    expect(sendWaitlistPromotion).toHaveBeenCalledTimes(1)
  })

  it('returns race-lost and skips email when another process already promoted', async () => {
    // The conditional UPDATE (WHERE status = 'waitlisted') affected zero rows
    // because another worker flipped it first.
    const { client, update } = makeFakeSupabase({
      nextWaitlisted: { id: 'b1', user_id: 'u1', users: { email: 'a@b.co', name: 'Ada' } },
      updateRowsAffected: 0,
    })

    const result = await promoteNextWaitlistMember(client, 'inst-1', farFuture(), 'https://app.test')

    expect(result).toEqual({ promoted: false, reason: 'race-lost' })
    expect(update).toHaveBeenCalledTimes(1) // update attempted but no-op
    expect(sendWaitlistPromotion).not.toHaveBeenCalled() // critical: no double-email
  })

  it('reports email-failed but still counts as promoted if send throws', async () => {
    sendWaitlistPromotion.mockRejectedValueOnce(new Error('resend down'))
    const { client } = makeFakeSupabase({
      nextWaitlisted: { id: 'b1', user_id: 'u1', users: { email: 'a@b.co', name: 'Ada' } },
      updateRowsAffected: 1,
    })

    const result = await promoteNextWaitlistMember(client, 'inst-1', farFuture(), 'https://app.test')

    expect(result.promoted).toBe(true)
    expect(result.reason).toBe('email-failed')
    expect(result.bookingId).toBe('b1')
  })

  it('reports db-error when the update itself errors', async () => {
    const { client } = makeFakeSupabase({
      nextWaitlisted: { id: 'b1', user_id: 'u1', users: { email: 'a@b.co', name: 'Ada' } },
      updateRowsAffected: 0,
      updateError: { message: 'connection refused' },
    })

    const result = await promoteNextWaitlistMember(client, 'inst-1', farFuture(), 'https://app.test')

    expect(result).toEqual({ promoted: false, reason: 'db-error' })
    expect(sendWaitlistPromotion).not.toHaveBeenCalled()
  })
})
