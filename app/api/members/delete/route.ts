import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { promoteNextWaitlistMember }
import { auditLog } from '@/lib/audit/gym-log' from '@/lib/bookings/waitlist'
import type { BookingWithInstance } from '@/lib/bookings/types'
import { z } from '@/lib/validation/z'
import { parseBody, jsonOk, jsonError } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({ memberId: z.uuid() })

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const parsed = await parseBody(req, schema)
  if (parsed instanceof NextResponse) return parsed
  const { memberId } = parsed
  const now = new Date().toISOString()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Verify member belongs to this gym + fetch gym timezone for email formatting
  const [{ data: member }, { data: gymRow }] = await Promise.all([
    supabase.from('users').select('id').eq('id', memberId).eq('gym_id', userData.gym_id).single(),
    supabase.from('gyms').select('timezone').eq('id', userData.gym_id).single(),
  ])
  if (!member) return jsonError('Member not found', 404)
  const timezone: string = (gymRow as { timezone?: string } | null)?.timezone ?? 'UTC'

  // Cancel all future bookings
  const { data: rawBookings } = await supabase.from('bookings')
    .select('id, instance_id, status, class_instances(starts_at)')
    .eq('user_id', memberId)
    .eq('gym_id', userData.gym_id)
    .in('status', ['confirmed', 'waitlisted', 'pending_confirmation'])
    .returns<BookingWithInstance[]>()

  const futureBookings = (rawBookings ?? [])
    .filter(b => new Date(b.class_instances.starts_at) > new Date())

  const futureBookingIds = futureBookings.map(b => b.id)

  // Capture instance_ids for confirmed/pending bookings only — cancelling a waitlisted
  // booking does not free a spot, so no promotion is needed for those.
  const instanceIdsToPromote = futureBookings
    .filter(b => b.status === 'confirmed' || b.status === 'pending_confirmation')
    .map(b => b.instance_id)
    .filter((id, idx, arr) => arr.indexOf(id) === idx)

  if (futureBookingIds.length > 0) {
    await supabase.from('bookings')
      .update({ status: 'cancelled', cancelled_at: now })
      .in('id', futureBookingIds)
  }

  // Build a map of instance_id → starts_at from already-fetched data
  const instanceStartsAt = new Map<string, string>()
  for (const b of futureBookings) {
    if (!instanceStartsAt.has(b.instance_id)) {
      instanceStartsAt.set(b.instance_id, b.class_instances.starts_at)
    }
  }

  // Promote next waitlisted member for each instance that had a spot freed.
  // Parallelize to avoid serial latency when a member with many bookings is
  // deleted (addresses the "serial awaits in loop" performance finding).
  await Promise.all(
    instanceIdsToPromote.map(async instanceId => {
      const startsAt = instanceStartsAt.get(instanceId)
      if (!startsAt) return
      try {
        await promoteNextWaitlistMember(supabase, instanceId, startsAt, appUrl, timezone)
      } catch (err) {
        console.error('[members/delete] promote failed', { instanceId, err })
      }
    })
  )

  // Delete user row
  await supabase.from('users').delete().eq('id', memberId).eq('gym_id', userData.gym_id)

  // Delete from Supabase Auth
  const adminSupabase = createAdminClient()
  await adminSupabase.auth.admin.deleteUser(memberId)

    auditLog({ gymId: userData.gym_id, actorId: userData.userId, action: 'member.delete', targetId: memberId, targetType: 'user' })
  return jsonOk({ success: true })
}
