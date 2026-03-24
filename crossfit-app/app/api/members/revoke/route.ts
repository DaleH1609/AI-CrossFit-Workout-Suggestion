import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

interface FutureBooking {
  id: string
  class_instances: { starts_at: string }
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: ownerData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (ownerData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { memberId } = await req.json()
  const now = new Date().toISOString()

  const { data: member } = await supabase.from('users').select('email, name').eq('id', memberId).single()

  await supabase.from('users').update({ revoked_at: now }).eq('id', memberId).eq('gym_id', ownerData.gym_id)

  const { data: futureBookings } = await supabase.from('bookings')
    .select('id, class_instances(starts_at)')
    .eq('user_id', memberId).in('status', ['confirmed', 'waitlisted', 'pending_confirmation'])

  if (futureBookings) {
    for (const b of (futureBookings as unknown as FutureBooking[])) {
      if (new Date(b.class_instances.starts_at) > new Date()) {
        await supabase.from('bookings').update({ status: 'cancelled', cancelled_at: now }).eq('id', b.id)
      }
    }
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
