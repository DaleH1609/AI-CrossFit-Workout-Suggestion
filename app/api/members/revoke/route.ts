import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'

interface BookingWithInstance { id: string; instance_id: string; status: string; class_instances: { starts_at: string } }

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { memberId } = await req.json()
  const now = new Date().toISOString()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { data: member } = await supabase.from('users').select('email, name').eq('id', memberId).single()

  await supabase.from('users').update({ revoked_at: now }).eq('id', memberId).eq('gym_id', userData.gym_id)

  // Task 3: batch cancel all future bookings in a single UPDATE instead of one per booking
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

  // Promote next waitlisted member for each instance that had a spot freed
  for (const instanceId of instanceIdsToPromote) {
    const { data: instanceData } = await supabase
      .from('class_instances')
      .select('starts_at')
      .eq('id', instanceId)
      .single()
    if (instanceData?.starts_at) {
      await promoteNextWaitlistMember(supabase, instanceId, instanceData.starts_at, appUrl)
    }
  }

  if (member) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'noreply@yourgym.com',
      to: member.email,
      subject: 'Your gym access has been removed',
      html: `<p>Hi ${member.name}, your access to the gym has been removed and your upcoming bookings have been cancelled.</p>`
    })
  }

  return NextResponse.json({ success: true })
}
