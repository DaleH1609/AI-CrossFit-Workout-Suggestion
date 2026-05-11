// app/api/bookings/route.ts
import { NextResponse } from 'next/server'
import { requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'
import { sendBookingConfirmed, sendBookingCancelled } from '@/lib/email/send'
import { sendPushToUser } from '@/lib/push/send'
import { z } from '@/lib/validation/z'
import { parseBody, jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/admin'

const postSchema = z.object({ instanceId: z.uuid() })
const deleteSchema = z.object({ bookingId: z.uuid() })

interface ClassInstance {
  id: string
  starts_at: string
  capacity: number
}

interface BookingWithInstance {
  id: string
  class_instances: { starts_at: string; id: string }
}

interface GymSettings {
  cancellation_cutoff_hours: number
  waitlist_enabled: boolean
  booking_advance_hours: number
  notify_booking_confirmed: boolean
  contact_email: string | null
}

export async function POST(req: Request) {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, user, userData } = auth
  const parsed = await parseBody(req, postSchema)
  if (parsed instanceof NextResponse) return parsed
  const { instanceId } = parsed

  // Fetch instance + gym settings in parallel
  const [{ data: instance }, { data: gymRaw }] = await Promise.all([
    supabase.from('class_instances').select('id, starts_at, capacity').eq('id', instanceId).eq('gym_id', userData.gym_id).single<ClassInstance>(),
    supabase.from('gyms').select('cancellation_cutoff_hours, waitlist_enabled, booking_advance_hours, notify_booking_confirmed, contact_email').eq('id', userData.gym_id).single(),
  ])

  if (!instance) return jsonError('Class not found', 404)

  const gym = gymRaw as unknown as GymSettings | null
  const bookingAdvanceHours: number = gym?.booking_advance_hours ?? 0
  const waitlistEnabled: boolean = gym?.waitlist_enabled ?? true
  const notifyBookingConfirmed: boolean = gym?.notify_booking_confirmed ?? true
  const contactEmail: string | null = gym?.contact_email ?? null

  // Booking window check — if set, class must be within N hours from now
  if (bookingAdvanceHours > 0) {
    const windowMs = bookingAdvanceHours * 60 * 60 * 1000
    const opensAt = new Date(new Date(instance.starts_at).getTime() - windowMs)
    if (Date.now() < opensAt.getTime()) {
      return jsonError(`Bookings open ${bookingAdvanceHours} hours before class`)
    }
  }

  // Double-book / overlap prevention: if this user already has a non-cancelled
  // booking for another class with the same start time, refuse. Approximates
  // overlap without a per-class `duration` column: if two classes start at the
  // exact same moment, they unquestionably overlap.
  const { data: sameSlot } = await supabase
    .from('bookings')
    .select('id, class_instances!inner(starts_at)')
    .eq('user_id', user.id)
    .in('status', ['confirmed', 'pending_confirmation', 'waitlisted'])
    .eq('class_instances.starts_at', instance.starts_at)
    .neq('instance_id', instanceId)
    .limit(1)
    .maybeSingle()

  if (sameSlot) {
    return jsonError('You already have a booking at this time', 409)
  }

  // Check for an existing cancelled booking to pass to the atomic function
  // (unique constraint on instance_id+user_id means we must UPDATE, not INSERT)
  const { data: existing } = await supabase.from('bookings')
    .select('id').eq('instance_id', instanceId).eq('user_id', user.id).eq('status', 'cancelled').maybeSingle()

  // Atomic capacity check + insert/update in a single serialised transaction.
  // The DB function holds a FOR UPDATE lock on the class_instances row so
  // concurrent requests cannot race past the capacity check.
  const { data: rpcResult, error: rpcError } = await createAdminClient()
    .rpc('insert_booking_atomic', {
      p_gym_id:           userData.gym_id,
      p_instance_id:      instanceId,
      p_user_id:          user.id,
      p_waitlist_enabled: waitlistEnabled,
      p_max_waitlist:     10,
      p_existing_id:      existing?.id ?? null,
    })

  if (rpcError || !rpcResult) return jsonServerError('bookings POST', rpcError)

  const result = rpcResult as { booking_id?: string; status?: string; waitlist_position?: number | null; error?: string }

  if (result.error === 'class_full')    return jsonError('Class is full')
  if (result.error === 'waitlist_full') return jsonError('Waitlist is full')
  if (result.error)                     return jsonError('Booking failed')

  const { booking_id, status } = result as { booking_id: string; status: string }

  if (status === 'confirmed' && notifyBookingConfirmed) {
    try {
      const classDate = new Date(instance.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      const classTime = new Date(instance.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      await sendBookingConfirmed(userData.email, userData.name, classDate, classTime, contactEmail)
    } catch {
      // Email failure must not roll back the booking
    }
  }

  return jsonOk({ booking: { id: booking_id, status } })
}

export async function DELETE(req: Request) {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, user, userData } = auth
  const parsedDel = await parseBody(req, deleteSchema)
  if (parsedDel instanceof NextResponse) return parsedDel
  const { bookingId } = parsedDel

  const { data: booking } = await supabase.from('bookings')
    .select('id, class_instances(starts_at, id)')
    .eq('id', bookingId).eq('user_id', user.id).eq('gym_id', userData.gym_id).single<BookingWithInstance>()

  if (!booking) return jsonError('Booking not found', 404)

  const instance = booking.class_instances

  // Check gym's cancellation cutoff + contact email
  const { data: gymRaw } = await supabase.from('gyms')
    .select('cancellation_cutoff_hours, contact_email, timezone').eq('id', userData.gym_id).single()
  const gymData = gymRaw as unknown as { cancellation_cutoff_hours: number; contact_email: string | null; timezone: string | null } | null
  const cutoffHours: number = gymData?.cancellation_cutoff_hours ?? 0
  const contactEmail: string | null = gymData?.contact_email ?? null
  const timezone: string = gymData?.timezone ?? 'UTC'

  if (cutoffHours > 0) {
    const cutoffMs = cutoffHours * 60 * 60 * 1000
    if (Date.now() > new Date(instance.starts_at).getTime() - cutoffMs) {
      return jsonError(`Cancellations close ${cutoffHours} hour${cutoffHours !== 1 ? 's' : ''} before class`)
    }
  }

  // Use admin client: the narrowed member RLS (migration 053) revokes UPDATE
  // from authenticated, so the user-scoped client would silently no-op.
  const { error: cancelError } = await createAdminClient().from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('user_id', user.id)           // belt-and-braces: still scope to this user
    .eq('gym_id', userData.gym_id)    // and this gym
  if (cancelError) return jsonServerError('bookings DELETE', cancelError)

  try {
    const classDate = new Date(instance.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const classTime = new Date(instance.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    await sendBookingCancelled(userData.email, userData.name, classDate, classTime, contactEmail)
  } catch {
    // Email failure must not roll back the cancellation
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  // Use admin client: the promotion UPDATE targets another member's row and
  // the member's narrow RLS (migration 022) would silently no-op on it.
  const promotion = await promoteNextWaitlistMember(createAdminClient(), instance.id, instance.starts_at, appUrl, timezone)

  // Send push notification to the promoted member (fire-and-forget)
  if (promotion.promoted && promotion.bookingId) {
    const { data: promotedBooking } = await createAdminClient()
      .from('bookings').select('user_id').eq('id', promotion.bookingId).single<{ user_id: string }>()
    if (promotedBooking?.user_id) {
      const classTime = new Date(instance.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      sendPushToUser(promotedBooking.user_id, {
        title: 'Spot opened for you! 🎉',
        body: `A space opened in the ${classTime} class — confirm your spot before it expires`,
        url: '/my-schedule',
      }).catch(err => console.error('[bookings DELETE] waitlist push failed', err))
    }
  }

  return jsonOk({ success: true })
}
