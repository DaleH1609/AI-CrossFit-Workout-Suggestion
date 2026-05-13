// app/api/bookings/route.ts
import { NextResponse } from 'next/server'
import { requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'
import { sendBookingConfirmed, sendBookingCancelled } from '@/lib/email/send'
import { sendPushToUser } from '@/lib/push/send'
import { dispatchWebhooks } from '@/lib/webhooks/dispatch'
import { z } from '@/lib/validation/z'
import { parseBody, jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/admin'

const postSchema = z.object({ instanceId: z.uuid() })
const deleteSchema = z.object({ bookingId: z.uuid() })

interface ClassInstance {
  id: string
  starts_at: string
  capacity: number
  class_slot_templates: { name: string } | null
}

interface BookingWithInstance {
  id: string
  class_instances: { starts_at: string; id: string; class_slot_templates: { name: string } | null }
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
    supabase.from('class_instances').select('id, starts_at, capacity, class_slot_templates(name)').eq('id', instanceId).eq('gym_id', userData.gym_id).single<ClassInstance>(),
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

  // Atomic capacity check + insert/update in a single serialised transaction.
  // The DB function holds a FOR UPDATE lock on the class_instances row so
  // concurrent requests cannot race past the capacity check. The function
  // also discovers any existing cancelled booking internally (K8: migration
  // 056), eliminating the pre-RPC SELECT race window.
  const { data: rpcResult, error: rpcError } = await createAdminClient()
    .rpc('insert_booking_atomic', {
      p_gym_id:           userData.gym_id,
      p_instance_id:      instanceId,
      p_user_id:          user.id,
      p_waitlist_enabled: waitlistEnabled,
      p_max_waitlist:     10,
    })

  if (rpcError || !rpcResult) return jsonServerError('bookings POST', rpcError)

  const result = rpcResult as { booking_id?: string; status?: string; waitlist_position?: number | null; error?: string }

  if (result.error === 'class_full')    return jsonError('Class is full')
  if (result.error === 'waitlist_full') return jsonError('Waitlist is full')
  if (result.error)                     return jsonError('Booking failed')

  const { booking_id, status } = result as { booking_id: string; status: string }

  const classDate = new Date(instance.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const classTime = new Date(instance.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const className = instance.class_slot_templates?.name ?? 'class'

  if (status === 'confirmed') {
    if (notifyBookingConfirmed) {
      sendBookingConfirmed(userData.email, userData.name, classDate, classTime, contactEmail).catch(() => {})
    }
    dispatchWebhooks(userData.gym_id, 'booking_confirmed', {
      memberName: userData.name,
      className,
      classTime: `${classDate} ${classTime}`,
    }).catch(err => console.error('[bookings POST] webhook dispatch failed', err))
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
    .select('id, class_instances(starts_at, id, class_slot_templates(name))')
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

  // Use the cancel_booking RPC (migration 063): encodes the user+gym ownership
  // check and the valid-status guard in one atomic call via the admin client.
  // The admin client is required because the narrowed member RLS (migration 053)
  // revokes direct UPDATE from authenticated users.
  const { error: cancelError } = await createAdminClient()
    .rpc('cancel_booking', { p_booking_id: bookingId, p_gym_id: userData.gym_id, p_user_id: user.id })
  if (cancelError) return jsonServerError('bookings DELETE', cancelError)

  const classDate = new Date(instance.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const classTime = new Date(instance.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const className = instance.class_slot_templates?.name ?? 'class'

  sendBookingCancelled(userData.email, userData.name, classDate, classTime, contactEmail).catch(() => {})
  dispatchWebhooks(userData.gym_id, 'booking_cancelled', {
    memberName: userData.name,
    className,
    classTime: `${classDate} ${classTime}`,
  }).catch(err => console.error('[bookings DELETE] webhook dispatch failed', err))

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
