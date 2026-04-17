// app/api/bookings/route.ts
import { NextResponse } from 'next/server'
import { requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'
import { sendBookingConfirmed, sendBookingCancelled } from '@/lib/email/send'
import { z } from '@/lib/validation/z'
import { parseBody, jsonServerError } from '@/lib/api/response'

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
    supabase.from('class_instances').select('id, starts_at, capacity').eq('id', instanceId).single<ClassInstance>(),
    supabase.from('gyms').select('cancellation_cutoff_hours, waitlist_enabled, booking_advance_hours, notify_booking_confirmed, contact_email').eq('id', userData.gym_id).single(),
  ])

  if (!instance) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

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
      return NextResponse.json(
        { error: `Bookings open ${bookingAdvanceHours} hours before class`, opensAt: opensAt.toISOString() },
        { status: 400 }
      )
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
    return NextResponse.json(
      { error: 'You already have a booking at this time' },
      { status: 409 }
    )
  }

  // Count confirmed bookings
  const { count } = await supabase.from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('instance_id', instanceId).in('status', ['confirmed', 'pending_confirmation'])

  const isFull = (count ?? 0) >= instance.capacity

  if (isFull && !waitlistEnabled) {
    return NextResponse.json({ error: 'Class is full' }, { status: 400 })
  }

  // Count waitlist size
  const { count: waitlistCount } = await supabase.from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('instance_id', instanceId).eq('status', 'waitlisted')

  const maxWaitlist = 10
  if (isFull && (waitlistCount ?? 0) >= maxWaitlist) {
    return NextResponse.json({ error: 'Waitlist is full' }, { status: 400 })
  }

  const status = isFull ? 'waitlisted' : 'confirmed'
  const waitlist_position = isFull ? (waitlistCount ?? 0) + 1 : null

  // Check for an existing cancelled booking (unique constraint on instance_id+user_id)
  const { data: existing } = await supabase.from('bookings')
    .select('id').eq('instance_id', instanceId).eq('user_id', user.id).eq('status', 'cancelled').maybeSingle()

  let booking: { id: string } | null = null, error: { message: string } | null = null
  if (existing) {
    ;({ data: booking, error } = await supabase.from('bookings')
      .update({ status, waitlist_position, cancelled_at: null, confirmation_token: null, confirmation_expires_at: null })
      .eq('id', existing.id).select().single())
  } else {
    ;({ data: booking, error } = await supabase.from('bookings').insert({
      gym_id: userData.gym_id,
      instance_id: instanceId,
      user_id: user.id,
      status,
      waitlist_position,
    }).select().single())
  }

  if (error || !booking) return jsonServerError('bookings POST', error)

  // Post-insert race condition check: if two requests slipped through simultaneously,
  // recount and cancel the just-created booking if we're now over capacity.
  if (status === 'confirmed') {
    const { count: finalCount } = await supabase.from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('instance_id', instanceId)
      .in('status', ['confirmed', 'pending_confirmation'])
    if ((finalCount ?? 0) > instance.capacity) {
      await supabase.from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', booking.id)
      return NextResponse.json({ error: 'Class is full' }, { status: 400 })
    }
  }

  if (status === 'confirmed' && notifyBookingConfirmed) {
    try {
      const classDate = new Date(instance.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      const classTime = new Date(instance.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      await sendBookingConfirmed(userData.email, userData.name, classDate, classTime, contactEmail)
    } catch {
      // Email failure must not roll back the booking
    }
  }

  return NextResponse.json({ booking })
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

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const instance = booking.class_instances

  // Check gym's cancellation cutoff + contact email
  const { data: gymRaw } = await supabase.from('gyms')
    .select('cancellation_cutoff_hours, contact_email').eq('id', userData.gym_id).single()
  const gymData = gymRaw as unknown as { cancellation_cutoff_hours: number; contact_email: string | null } | null
  const cutoffHours: number = gymData?.cancellation_cutoff_hours ?? 0
  const contactEmail: string | null = gymData?.contact_email ?? null

  if (cutoffHours > 0) {
    const cutoffMs = cutoffHours * 60 * 60 * 1000
    if (Date.now() > new Date(instance.starts_at).getTime() - cutoffMs) {
      return NextResponse.json(
        { error: `Cancellations close ${cutoffHours} hour${cutoffHours !== 1 ? 's' : ''} before class` },
        { status: 400 }
      )
    }
  }

  const { error: cancelError } = await supabase.from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', bookingId)
  if (cancelError) return jsonServerError('bookings DELETE', cancelError)

  try {
    const classDate = new Date(instance.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const classTime = new Date(instance.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    await sendBookingCancelled(userData.email, userData.name, classDate, classTime, contactEmail)
  } catch {
    // Email failure must not roll back the cancellation
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  await promoteNextWaitlistMember(supabase, instance.id, instance.starts_at, appUrl)

  return NextResponse.json({ success: true })
}
