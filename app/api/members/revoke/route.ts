import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'
import { sendAccessRevoked } from '@/lib/email/send'
import { z } from '@/lib/validation/z'
import { parseBody } from '@/lib/api/response'

interface BookingWithInstance { id: string; instance_id: string; status: string; class_instances: { starts_at: string } }

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

  const { data: member } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', memberId)
    .eq('gym_id', userData.gym_id)
    .single()

  await supabase.from('users').update({ revoked_at: now }).eq('id', memberId).eq('gym_id', userData.gym_id)

  // Batch cancel all future bookings in a single UPDATE instead of one per booking
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
  // Parallelize so many-booking members don't cause serial latency.
  await Promise.all(
    instanceIdsToPromote.map(async instanceId => {
      const startsAt = instanceStartsAt.get(instanceId)
      if (!startsAt) return
      try {
        await promoteNextWaitlistMember(supabase, instanceId, startsAt, appUrl)
      } catch (err) {
        console.error('[members/revoke] promote failed', { instanceId, err })
      }
    })
  )

  if (member) {
    try {
      await sendAccessRevoked(member.email, member.name)
    } catch (err) {
      // Revocation must succeed even if the email fails; log but don't fail the request.
      console.error('[members/revoke] email failed', { memberId, err })
    }
  }

  return NextResponse.json({ success: true })
}
