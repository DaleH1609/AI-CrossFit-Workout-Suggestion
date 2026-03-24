// app/api/bookings/route.ts
import { NextResponse } from 'next/server'
import { requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'
import { sendBookingConfirmed, sendBookingCancelled } from '@/lib/email/send'
import { BOOKING_ADVANCE_DAYS } from '@/lib/utils'

interface ClassInstance {
  id: string
  starts_at: string
  capacity: number
}

interface BookingWithInstance {
  id: string
  class_instances: { starts_at: string; id: string }
}

export async function POST(req: Request) {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, user, userData } = auth
  const { instanceId } = await req.json()

  // Get instance details
  const { data: instance } = await supabase.from('class_instances')
    .select('id, starts_at, capacity').eq('id', instanceId).single<ClassInstance>()
  if (!instance) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  // Booking advance window check
  const advanceMs = BOOKING_ADVANCE_DAYS * 24 * 60 * 60 * 1000
  const windowOpen = Date.now() + advanceMs
  if (new Date(instance.starts_at).getTime() > windowOpen) {
    return NextResponse.json(
      { error: `Bookings open ${BOOKING_ADVANCE_DAYS} days before class`, opensAt: new Date(new Date(instance.starts_at).getTime() - advanceMs).toISOString() },
      { status: 400 }
    )
  }

  // Count confirmed bookings
  const { count } = await supabase.from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('instance_id', instanceId).in('status', ['confirmed', 'pending_confirmation'])

  const isFull = (count ?? 0) >= instance.capacity

  // Count waitlist size
  const { count: waitlistCount } = await supabase.from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('instance_id', instanceId).eq('status', 'waitlisted')

  const maxWaitlist = 10 // TODO: make configurable per gym
  if (isFull && (waitlistCount ?? 0) >= maxWaitlist) {
    return NextResponse.json({ error: 'Waitlist is full' }, { status: 400 })
  }

  const status = isFull ? 'waitlisted' : 'confirmed'
  const waitlist_position = isFull ? (waitlistCount ?? 0) + 1 : null

  const { data: booking, error } = await supabase.from('bookings').insert({
    gym_id: userData.gym_id,
    instance_id: instanceId,
    user_id: user.id,
    status,
    waitlist_position,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'confirmed') {
    const classDate = new Date(instance.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const classTime = new Date(instance.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    await sendBookingConfirmed(userData.email, userData.name, classDate, classTime)
  }

  return NextResponse.json({ booking })
}

export async function DELETE(req: Request) {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, user, userData } = auth
  const { bookingId } = await req.json()

  const { data: booking } = await supabase.from('bookings')
    .select('id, class_instances(starts_at, id)')
    .eq('id', bookingId).eq('user_id', user.id).single<BookingWithInstance>()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const instance = booking.class_instances
  const oneHourBefore = new Date(instance.starts_at).getTime() - 60 * 60 * 1000
  if (Date.now() > oneHourBefore) {
    return NextResponse.json({ error: 'Cannot cancel within 1 hour of class' }, { status: 400 })
  }

  const { error: cancelError } = await supabase.from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', bookingId)
  if (cancelError) return NextResponse.json({ error: cancelError.message }, { status: 500 })

  const classDate = new Date(instance.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const classTime = new Date(instance.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  await sendBookingCancelled(userData.email, userData.name, classDate, classTime)

  await promoteNextWaitlistMember(supabase, instance.id, instance.starts_at, process.env.NEXT_PUBLIC_APP_URL!)

  return NextResponse.json({ success: true })
}
