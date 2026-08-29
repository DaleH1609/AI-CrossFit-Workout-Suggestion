import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'
import { jsonOk, jsonServerError } from '@/lib/api/response'
import { assertCronAuth } from '@/lib/api/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Cron can be slow on large gyms; allow up to 5 minutes.
export const maxDuration = 300

export async function GET(req: Request) {
  const reject = assertCronAuth(req)
  if (reject) return reject

  const supabase = createAdminClient()

  const now = new Date().toISOString()

  const { data: expiredBookings, error } = await supabase
    .from('bookings')
    .select('id, instance_id')
    .eq('status', 'pending_confirmation')
    .lt('confirmation_expires_at', now)

  if (error) return jsonServerError('cron/waitlist-expire fetch expired', error)

  if (!expiredBookings || expiredBookings.length === 0) {
    return jsonOk({ processed: 0, promoted: 0, skipped: 0 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Batch-fetch all instance start times + gym timezone (fixes N+1)
  const instanceIds = Array.from(new Set(expiredBookings.map(b => b.instance_id)))
  const { data: instances, error: instErr } = await supabase
    .from('class_instances')
    .select('id, starts_at, gyms(timezone)')
    .in('id', instanceIds)

  if (instErr) return jsonServerError('cron/waitlist-expire fetch instances', instErr)

  interface InstanceRow {
    id?: string
    starts_at?: string
    gyms?: { timezone?: string } | { timezone?: string }[] | null
  }
  const instanceMap = new Map<string, { startsAt: string; timezone: string }>()
  for (const inst of (instances ?? []) as InstanceRow[]) {
    if (!inst?.id || !inst?.starts_at) continue
    const gymRel = Array.isArray(inst.gyms) ? inst.gyms[0] : inst.gyms
    instanceMap.set(inst.id, {
      startsAt: inst.starts_at,
      timezone: gymRel?.timezone ?? 'UTC',
    })
  }

  let processed = 0
  let promoted = 0
  let skipped = 0
  const errors: Array<{ bookingId: string; stage: string; err: unknown }> = []

  for (const booking of expiredBookings) {
    try {
      // expire_pending_confirmation RPC (migration 063): idempotent cancel
      // scoped to pending_confirmation.  If another concurrent cron run or the
      // confirm route already handled this row, cancelled = false and we skip
      // promotion — no double-promotion, no duplicate email.
      const { data: expireResult, error: cancelErr } = await supabase
        .rpc('expire_pending_confirmation' as never, { p_booking_id: booking.id } as never)

      if (cancelErr) {
        errors.push({ bookingId: booking.id, stage: 'cancel', err: cancelErr })
        continue
      }

      const expired = expireResult as { cancelled: boolean; instance_id: string | null }
      if (!expired?.cancelled) {
        // Already handled by someone else. Don't promote again.
        skipped++
        continue
      }

      const instInfo = instanceMap.get(booking.instance_id)
      if (!instInfo) {
        // Instance missing — can't promote, but cancel already happened.
        processed++
        continue
      }

      const result = await promoteNextWaitlistMember(
        supabase,
        booking.instance_id,
        instInfo.startsAt,
        appUrl,
        instInfo.timezone,
      )
      if (result.promoted) promoted++
      processed++
    } catch (err) {
      errors.push({ bookingId: booking.id, stage: 'loop', err })
    }
  }

  if (errors.length) {
    console.error('[cron/waitlist-expire] partial failures', errors)
  }

  // Heartbeat — fire-and-forget. Set CRON_HEARTBEAT_WAITLIST_EXPIRE to a
  // Healthchecks.io / Better Stack ping URL to alert if this cron goes silent.
  const heartbeatUrl = process.env.CRON_HEARTBEAT_WAITLIST_EXPIRE
  if (heartbeatUrl) fetch(heartbeatUrl).catch(() => {})

  return jsonOk({
    processed,
    promoted,
    skipped,
    errors: errors.length,
  })
}
