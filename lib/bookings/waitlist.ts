// lib/bookings/waitlist.ts
import { sendWaitlistPromotion } from '@/lib/email/send'

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

export function shouldSkipPromotion(startsAt: string): boolean {
  return new Date(startsAt).getTime() - Date.now() <= TWO_HOURS_MS
}

export function getConfirmationWindow(startsAt: string): number {
  const timeUntilClass = new Date(startsAt).getTime() - Date.now()
  return Math.min(TWO_HOURS_MS, timeUntilClass)
}

export interface PromotionResult {
  promoted: boolean
  reason?: 'too-close' | 'no-waitlist' | 'race-lost' | 'db-error' | 'email-failed'
  bookingId?: string
}

interface WaitlistBooking {
  id: string
  user_id: string
  users: { email: string; name: string } | { email: string; name: string }[] | null
}

// Narrow (supabase-js can return the relation as array or object depending on shape)
function getUser(b: WaitlistBooking): { email: string; name: string } | null {
  if (!b.users) return null
  if (Array.isArray(b.users)) return b.users[0] ?? null
  return b.users
}

type UpdateResult = { data: unknown[] | null; error: unknown }
type SelectResult<T> = { data: T | null; error?: unknown }

type QueryBuilder = {
  select: (q: string, opts?: Record<string, unknown>) => QueryBuilder
  eq: (k: string, v: string) => QueryBuilder
  order: (k: string, o?: { ascending: boolean }) => QueryBuilder
  limit: (n: number) => QueryBuilder
  maybeSingle: <T = unknown>() => Promise<SelectResult<T>>
  update: (data: Record<string, unknown>) => QueryBuilder
}

type DbClient = { from: (table: string) => QueryBuilder }

/**
 * Atomically promotes the next waitlisted member for a class.
 *
 * Race safety: the UPDATE is conditional on the row still being 'waitlisted'.
 * If another process promoted the same member first, our UPDATE affects zero
 * rows and we return { promoted: false, reason: 'race-lost' } — no double
 * promotion, no duplicate email.
 *
 * Email is sent AFTER the DB state transition. If the email send fails, we
 * return { promoted: true, reason: 'email-failed' }: the booking is already
 * in `pending_confirmation` and will expire naturally via the waitlist-expire
 * cron, which will try the next person. This is preferable to rolling back
 * the DB state because a user might still click the confirm link from a
 * delayed/resent email.
 */
export async function promoteNextWaitlistMember(
  supabase: unknown,
  instanceId: string,
  startsAt: string,
  appUrl: string
): Promise<PromotionResult> {
  if (shouldSkipPromotion(startsAt)) {
    return { promoted: false, reason: 'too-close' }
  }

  const db = supabase as DbClient

  // Find the next waitlisted member
  const { data: next } = await db
    .from('bookings')
    .select('id, user_id, users(email, name)')
    .eq('instance_id', instanceId)
    .eq('status', 'waitlisted')
    .order('waitlist_position', { ascending: true })
    .limit(1)
    .maybeSingle<WaitlistBooking>()

  if (!next) return { promoted: false, reason: 'no-waitlist' }

  const windowMs = getConfirmationWindow(startsAt)
  const expiresAt = new Date(Date.now() + windowMs).toISOString()
  const token = crypto.randomUUID()

  // Atomic claim: only promote if still 'waitlisted'. If a concurrent caller
  // already flipped it, rows.length === 0 and we bail out cleanly.
  const updatePromise = db.from('bookings').update({
    status: 'pending_confirmation',
    confirmation_token: token,
    confirmation_expires_at: expiresAt,
  })
    .eq('id', next.id)
    .eq('status', 'waitlisted')
    .select('id') as unknown as Promise<UpdateResult>

  const { data: rows, error: updateError } = await updatePromise

  if (updateError) {
    console.error('[waitlist] promote update failed', { instanceId, bookingId: next.id, err: updateError })
    return { promoted: false, reason: 'db-error' }
  }

  if (!rows || rows.length === 0) {
    // Another process already promoted this member — not an error.
    return { promoted: false, reason: 'race-lost' }
  }

  const user = getUser(next)
  if (!user) {
    // Promoted but we can't email them — still counts as a promotion
    return { promoted: true, bookingId: next.id, reason: 'email-failed' }
  }

  const confirmUrl = `${appUrl}/api/bookings/confirm/${token}`
  const expiresIn = windowMs >= TWO_HOURS_MS ? '2 hours' : 'before the class starts'
  const classDate = new Date(startsAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const classTime = new Date(startsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  try {
    await sendWaitlistPromotion(user.email, user.name, classDate, classTime, confirmUrl, expiresIn)
    return { promoted: true, bookingId: next.id }
  } catch (err) {
    console.error('[waitlist] promotion email failed', { instanceId, bookingId: next.id, err })
    // DB state stays in pending_confirmation; the cron will clean it up.
    return { promoted: true, bookingId: next.id, reason: 'email-failed' }
  }
}
