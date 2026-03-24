// app/api/bookings/confirm/[token]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'

interface BookingRow {
  id: string
  instance_id: string
  confirmation_expires_at: string | null
  class_instances: { starts_at: string }
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const supabase = createClient()

  const { data: bookingRaw } = await supabase.from('bookings')
    .select('*, class_instances(starts_at)')
    .eq('confirmation_token', params.token)
    .eq('status', 'pending_confirmation')
    .single()

  if (!bookingRaw) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/this-week?error=invalid-token`)
  }

  const booking = bookingRaw as unknown as BookingRow

  if (new Date(booking.confirmation_expires_at!).getTime() < Date.now()) {
    // Expired — pass to next waitlist member
    await supabase.from('bookings').update({ status: 'waitlisted', confirmation_token: null, confirmation_expires_at: null }).eq('id', booking.id)
    const instance = booking.class_instances
    await promoteNextWaitlistMember(supabase, booking.instance_id, instance.starts_at, process.env.NEXT_PUBLIC_APP_URL!)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/this-week?error=confirmation-expired`)
  }

  await supabase.from('bookings').update({
    status: 'confirmed',
    confirmation_token: null,
    confirmation_expires_at: null,
    waitlist_position: null,
  }).eq('id', booking.id)

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/my-schedule?confirmed=true`)
}
