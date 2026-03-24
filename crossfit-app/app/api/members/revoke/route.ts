import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

const resend = new Resend(process.env.RESEND_API_KEY)

interface BookingWithInstance { id: string; class_instances: { starts_at: string } }

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { memberId } = await req.json()
  const now = new Date().toISOString()

  const { data: member } = await supabase.from('users').select('email, name').eq('id', memberId).single()

  await supabase.from('users').update({ revoked_at: now }).eq('id', memberId).eq('gym_id', userData.gym_id)

  // Task 3: batch cancel all future bookings in a single UPDATE instead of one per booking
  const { data: rawBookings } = await supabase.from('bookings')
    .select('id, class_instances(starts_at)')
    .eq('user_id', memberId)
    .in('status', ['confirmed', 'waitlisted', 'pending_confirmation'])
    .returns<BookingWithInstance[]>()

  const futureBookingIds = (rawBookings ?? [])
    .filter(b => new Date(b.class_instances.starts_at) > new Date())
    .map(b => b.id)

  if (futureBookingIds.length > 0) {
    await supabase.from('bookings')
      .update({ status: 'cancelled', cancelled_at: now })
      .in('id', futureBookingIds)
  }

  if (member) {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'noreply@yourgym.com',
      to: member.email,
      subject: 'Your gym access has been removed',
      html: `<p>Hi ${member.name}, your access to the gym has been removed and your upcoming bookings have been cancelled.</p>`
    })
  }

  return NextResponse.json({ success: true })
}
