/**
 * tests/integration/bookings.test.ts
 *
 * Integration tests for the booking RPCs against a real Postgres testcontainer.
 * All migrations are applied once before the suite runs (see globalSetup).
 *
 * Tests exercise:
 *   - insert_booking_atomic  (capacity gate, waitlist, re-book)
 *   - cancel_booking         (member self-cancel)
 *   - expire_pending_confirmation  (cron + confirm/token expire path)
 *   - confirm_pending_booking      (happy path + class-full race)
 *   - bookings_enforce_status_transition trigger (illegal transitions blocked)
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { getPool } from './db'
import {
  createGym, createUser, createTemplate, createInstance,
  createBooking, bookingStatus, bookingRow,
} from './helpers'

// ---------------------------------------------------------------------------
// Shared gym/user/template — created once per suite to avoid overhead.
// Tests that need isolation create their own resources.
// ---------------------------------------------------------------------------

let gymId: string
let memberA: string
let memberB: string
let templateId: string

beforeAll(async () => {
  gymId = await createGym()
  memberA = await createUser(gymId, { role: 'member', name: 'Alice' })
  memberB = await createUser(gymId, { role: 'member', name: 'Bob' })
  templateId = await createTemplate(gymId, { capacity: 1 })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function rpc(fn: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const named = Object.keys(args).map((k, i) => `${k} => $${i + 1}`).join(', ')
  const { rows } = await getPool().query(
    `SELECT ${fn}(${named}) AS result`,
    Object.values(args),
  )
  return rows[0].result as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// insert_booking_atomic
// ---------------------------------------------------------------------------

describe('insert_booking_atomic', () => {
  it('creates a confirmed booking when capacity is available', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })

    const result = await rpc('insert_booking_atomic', {
      p_gym_id: gymId,
      p_instance_id: instanceId,
      p_user_id: memberA,
      p_waitlist_enabled: true,
      p_max_waitlist: 10,
    })

    expect(result.status).toBe('confirmed')
    expect(result.booking_id).toBeTruthy()
  })

  it('waitlists the second member when class is full (capacity=1)', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 1 })

    const r1 = await rpc('insert_booking_atomic', {
      p_gym_id: gymId, p_instance_id: instanceId,
      p_user_id: memberA, p_waitlist_enabled: true, p_max_waitlist: 10,
    })
    expect(r1.status).toBe('confirmed')

    const r2 = await rpc('insert_booking_atomic', {
      p_gym_id: gymId, p_instance_id: instanceId,
      p_user_id: memberB, p_waitlist_enabled: true, p_max_waitlist: 10,
    })
    expect(r2.status).toBe('waitlisted')
    expect(r2.waitlist_position).toBe(1)
  })

  it('returns class_full when waitlist is disabled', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 1 })

    await rpc('insert_booking_atomic', {
      p_gym_id: gymId, p_instance_id: instanceId,
      p_user_id: memberA, p_waitlist_enabled: false, p_max_waitlist: 0,
    })

    const result = await rpc('insert_booking_atomic', {
      p_gym_id: gymId, p_instance_id: instanceId,
      p_user_id: memberB, p_waitlist_enabled: false, p_max_waitlist: 0,
    })
    expect(result.error).toBe('class_full')
  })

  it('re-activates a cancelled booking rather than inserting a new row', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })
    // Seed a cancelled booking
    const cancelledId = await createBooking(gymId, instanceId, memberA, { status: 'cancelled' })

    const result = await rpc('insert_booking_atomic', {
      p_gym_id: gymId, p_instance_id: instanceId,
      p_user_id: memberA, p_waitlist_enabled: true, p_max_waitlist: 10,
    })

    expect(result.status).toBe('confirmed')
    // Should have re-used the same booking row, not created a new one
    expect(result.booking_id).toBe(cancelledId)
  })
})

// ---------------------------------------------------------------------------
// cancel_booking
// ---------------------------------------------------------------------------

describe('cancel_booking', () => {
  it('cancels a confirmed booking and returns cancelled=true', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })
    const bookingId = await createBooking(gymId, instanceId, memberA, { status: 'confirmed' })

    const result = await rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_gym_id: gymId,
      p_user_id: memberA,
    })

    expect(result.cancelled).toBe(true)
    expect(result.instance_id).toBe(instanceId)
    expect(await bookingStatus(bookingId)).toBe('cancelled')
  })

  it('is idempotent — returns cancelled=false if already cancelled', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })
    const bookingId = await createBooking(gymId, instanceId, memberA, { status: 'cancelled' })

    const result = await rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_gym_id: gymId,
      p_user_id: memberA,
    })

    expect(result.cancelled).toBe(false)
  })

  it('returns cancelled=false when the booking belongs to a different user', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })
    const bookingId = await createBooking(gymId, instanceId, memberA, { status: 'confirmed' })

    const result = await rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_gym_id: gymId,
      p_user_id: memberB,   // wrong user
    })

    expect(result.cancelled).toBe(false)
    expect(await bookingStatus(bookingId)).toBe('confirmed') // unchanged
  })

  it('cancels a waitlisted booking', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 1 })
    const bookingId = await createBooking(gymId, instanceId, memberA, {
      status: 'waitlisted',
      waitlistPosition: 1,
    })

    const result = await rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_gym_id: gymId,
      p_user_id: memberA,
    })

    expect(result.cancelled).toBe(true)
    const row = await bookingRow(bookingId)
    expect(row?.status).toBe('cancelled')
    expect(row?.waitlist_position).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// expire_pending_confirmation
// ---------------------------------------------------------------------------

describe('expire_pending_confirmation', () => {
  it('cancels a pending_confirmation booking', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })
    const bookingId = await createBooking(gymId, instanceId, memberA, {
      status: 'pending_confirmation',
      confirmationExpiresAt: new Date(Date.now() - 1000).toISOString(),  // already expired
    })

    const result = await rpc('expire_pending_confirmation', { p_booking_id: bookingId })

    expect(result.cancelled).toBe(true)
    expect(result.instance_id).toBe(instanceId)
    expect(await bookingStatus(bookingId)).toBe('cancelled')
  })

  it('is idempotent — second call returns cancelled=false', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })
    const bookingId = await createBooking(gymId, instanceId, memberA, {
      status: 'pending_confirmation',
    })

    await rpc('expire_pending_confirmation', { p_booking_id: bookingId })
    const result2 = await rpc('expire_pending_confirmation', { p_booking_id: bookingId })

    expect(result2.cancelled).toBe(false)
  })

  it('does not affect a confirmed booking', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })
    const bookingId = await createBooking(gymId, instanceId, memberA, { status: 'confirmed' })

    const result = await rpc('expire_pending_confirmation', { p_booking_id: bookingId })

    expect(result.cancelled).toBe(false)
    expect(await bookingStatus(bookingId)).toBe('confirmed')
  })
})

// ---------------------------------------------------------------------------
// confirm_pending_booking
// ---------------------------------------------------------------------------

describe('confirm_pending_booking', () => {
  it('confirms a pending_confirmation booking when capacity is available', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })
    const bookingId = await createBooking(gymId, instanceId, memberA, { status: 'pending_confirmation' })

    const result = await rpc('confirm_pending_booking', {
      p_booking_id: bookingId,
      p_instance_id: instanceId,
    })

    expect(result.confirmed).toBe(true)
    expect(await bookingStatus(bookingId)).toBe('confirmed')
  })

  it('cancels the pending booking and returns class_full when class has no room', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 1 })
    // Fill the class
    await createBooking(gymId, instanceId, memberA, { status: 'confirmed' })
    // Pending booking for B
    const bookingB = await createBooking(gymId, instanceId, memberB, { status: 'pending_confirmation' })

    const result = await rpc('confirm_pending_booking', {
      p_booking_id: bookingB,
      p_instance_id: instanceId,
    })

    expect(result.confirmed).toBe(false)
    expect(result.reason).toBe('class_full')
    expect(result.cancelled).toBe(true)
    expect(await bookingStatus(bookingB)).toBe('cancelled')
  })

  it('returns not_pending when booking is already confirmed (race)', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })
    const bookingId = await createBooking(gymId, instanceId, memberA, { status: 'confirmed' })

    const result = await rpc('confirm_pending_booking', {
      p_booking_id: bookingId,
      p_instance_id: instanceId,
    })

    expect(result.confirmed).toBe(false)
    expect(result.reason).toBe('not_pending')
  })
})

// ---------------------------------------------------------------------------
// bookings_enforce_status_transition trigger (migration 059)
// ---------------------------------------------------------------------------

describe('booking status transition trigger', () => {
  it('allows confirmed → cancelled', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })
    const bookingId = await createBooking(gymId, instanceId, memberA, { status: 'confirmed' })

    await expect(
      getPool().query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [bookingId])
    ).resolves.not.toThrow()
  })

  it('blocks confirmed → waitlisted (illegal transition)', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })
    const bookingId = await createBooking(gymId, instanceId, memberA, { status: 'confirmed' })

    await expect(
      getPool().query("UPDATE bookings SET status = 'waitlisted' WHERE id = $1", [bookingId])
    ).rejects.toThrow()
  })

  it('blocks cancelled → pending_confirmation (illegal transition)', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })
    const bookingId = await createBooking(gymId, instanceId, memberA, { status: 'cancelled' })

    await expect(
      getPool().query("UPDATE bookings SET status = 'pending_confirmation' WHERE id = $1", [bookingId])
    ).rejects.toThrow()
  })

  it('allows updating attended without changing status (no trigger fire)', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 5 })
    const bookingId = await createBooking(gymId, instanceId, memberA, { status: 'confirmed' })

    await expect(
      getPool().query('UPDATE bookings SET attended = true WHERE id = $1', [bookingId])
    ).resolves.not.toThrow()

    expect(await bookingStatus(bookingId)).toBe('confirmed')
  })
})

// ---------------------------------------------------------------------------
// Key product flow: cancel A → B promoted to pending_confirmation (waitlist)
// (Application layer must call promoteNextWaitlistMember after cancel;
//  this test verifies the DB state is correct at each step.)
// ---------------------------------------------------------------------------

describe('waitlist flow (DB state)', () => {
  it('cancelling confirmed booking of A leaves B waitlisted — application must promote', async () => {
    const instanceId = await createInstance(gymId, templateId, { capacity: 1 })

    const bookingA = await createBooking(gymId, instanceId, memberA, { status: 'confirmed' })
    const bookingB = await createBooking(gymId, instanceId, memberB, {
      status: 'waitlisted',
      waitlistPosition: 1,
    })

    // Cancel A
    const r = await rpc('cancel_booking', {
      p_booking_id: bookingA,
      p_gym_id: gymId,
      p_user_id: memberA,
    })
    expect(r.cancelled).toBe(true)

    // B is still waitlisted — the application layer calls promoteNextWaitlistMember
    expect(await bookingStatus(bookingB)).toBe('waitlisted')
  })
})
