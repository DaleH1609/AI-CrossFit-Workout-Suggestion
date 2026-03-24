// app/api/bookings/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'
import { sendBookingConfirmed, sendBookingCancelled } from '@/lib/email/send'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { instanceId } = await req.json()
  const { data: userData } = await supabase.from('users').select('gym_id, name, email').eq('id', user.id).single()

  // Get instance details
  const { data: instanceRaw } = await supabase.from('class_instances')
    .select('*').eq('id', instanceId).single()
  if (!instanceRaw) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  const instance = instanceRaw as any

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
    gym_id: userData!.gym_id,
    instance_id: instanceId,
    user_id: user.id,
    status,
    waitlist_position,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'confirmed') {
    const classDate = new Date(instance.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const classTime = new Date(instance.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    await sendBookingConfirmed(userData!.email, userData!.name, classDate, classTime)
  }

  return NextResponse.json({ booking })
}

export async function DELETE(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId } = await req.json()

  const { data: booking } = await supabase.from('bookings')
    .select('*, class_instances(starts_at, id)')
    .eq('id', bookingId).eq('user_id', user.id).single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const instance = (booking as any).class_instances
  const oneHourBefore = new Date(instance.starts_at).getTime() - 60 * 60 * 1000
  if (Date.now() > oneHourBefore) {
    return NextResponse.json({ error: 'Cannot cancel within 1 hour of class' }, { status: 400 })
  }

  await supabase.from('bookings').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', bookingId)

  const { data: userData } = await supabase.from('users').select('email, name').eq('id', user.id).single()
  const classDate = new Date(instance.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const classTime = new Date(instance.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  await sendBookingCancelled(userData!.email, userData!.name, classDate, classTime)

  await promoteNextWaitlistMember(supabase as any, instance.id, instance.starts_at, process.env.NEXT_PUBLIC_APP_URL!)

  return NextResponse.json({ success: true })
}
