/**
 * tests/integration/helpers.ts
 *
 * Seed helpers for integration tests.  Each helper inserts a row and returns
 * its id.  All inserts bypass RLS by using a direct Pool connection (which runs
 * as the superuser inside the testcontainer, equivalent to service_role).
 */

import { getPool } from './db'

export async function createGym(overrides: { name?: string; timezone?: string } = {}): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO gyms (name, timezone)
     VALUES ($1, $2)
     RETURNING id`,
    [overrides.name ?? 'Test Gym', overrides.timezone ?? 'UTC'],
  )
  return rows[0].id
}

export async function createUser(gymId: string, overrides: {
  role?: 'owner' | 'admin' | 'member' | 'coach'
  email?: string
  name?: string
} = {}): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO users (id, gym_id, email, name, role)
     VALUES (gen_random_uuid(), $1, $2, $3, $4)
     RETURNING id`,
    [
      gymId,
      overrides.email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
      overrides.name ?? 'Test User',
      overrides.role ?? 'member',
    ],
  )
  return rows[0].id
}

export async function createTemplate(gymId: string, overrides: {
  dayOfWeek?: number
  localTime?: string
  capacity?: number
  name?: string
} = {}): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO class_slot_templates (gym_id, day_of_week, local_time, capacity, name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      gymId,
      overrides.dayOfWeek ?? 1,
      overrides.localTime ?? '09:00',
      overrides.capacity ?? 10,
      overrides.name ?? 'WOD',
    ],
  )
  return rows[0].id
}

export async function createInstance(gymId: string, templateId: string, overrides: {
  startsAt?: string
  capacity?: number
} = {}): Promise<string> {
  const startsAt = overrides.startsAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO class_instances (gym_id, template_id, date, local_time, starts_at, capacity, name)
     VALUES ($1, $2, $3::date, '09:00', $4, $5, 'WOD')
     RETURNING id`,
    [gymId, templateId, startsAt.split('T')[0], startsAt, overrides.capacity ?? 10],
  )
  return rows[0].id
}

export async function createBooking(gymId: string, instanceId: string, userId: string, overrides: {
  status?: 'confirmed' | 'waitlisted' | 'pending_confirmation' | 'cancelled'
  waitlistPosition?: number | null
  confirmationExpiresAt?: string | null
} = {}): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO bookings (gym_id, instance_id, user_id, status, waitlist_position, confirmation_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      gymId,
      instanceId,
      userId,
      overrides.status ?? 'confirmed',
      overrides.waitlistPosition ?? null,
      overrides.confirmationExpiresAt ?? null,
    ],
  )
  return rows[0].id
}

export async function bookingStatus(bookingId: string): Promise<string | null> {
  const { rows } = await getPool().query<{ status: string }>(
    'SELECT status FROM bookings WHERE id = $1',
    [bookingId],
  )
  return rows[0]?.status ?? null
}

export async function bookingRow(bookingId: string): Promise<Record<string, unknown> | null> {
  const { rows } = await getPool().query(
    'SELECT * FROM bookings WHERE id = $1',
    [bookingId],
  )
  return rows[0] ?? null
}

/** Call an RPC function and return its jsonb result. */
export async function callRpc(fnName: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const keys = Object.keys(args)
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
  const params = `(${keys.map(k => `${k} => ${placeholders[keys.indexOf(k)]}`)})`

  // Build the SELECT fn(param => $n, …) call
  const named = keys.map((k, i) => `${k} => $${i + 1}`).join(', ')
  const { rows } = await getPool().query(
    `SELECT ${fnName}(${named}) AS result`,
    Object.values(args),
  )
  return rows[0].result as Record<string, unknown>
}
