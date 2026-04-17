import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'
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

  // Verify member belongs to this gym
  const { data: member } = await supabase.from('users')
    .select('id').eq('id', memberId).eq('gym_id', userData.gym_id).single()
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

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
        await promoteNextWaitlistMember(supabase, instanceId, startsAt, appUrl)
      } catch (err) {
        console.error('[members/delete] promote failed', { instanceId, err })
      }
    })
  )

  // Delete user row
  await supabase.from('users').delete().eq('id', memberId).eq('gym_id', userData.gym_id)

  // Delete from Supabase Auth
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  await adminSupabase.auth.admin.deleteUser(memberId)

  return NextResponse.json({ success: true })
}
