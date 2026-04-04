import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  const now = new Date().toISOString()

  const { data: expiredBookings, error } = await supabase
    .from('bookings')
    .select('id, instance_id')
    .eq('status', 'pending_confirmation')
    .lt('confirmation_expires_at', now)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!expiredBookings || expiredBookings.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  let processed = 0

  for (const booking of expiredBookings) {
    // Cancel the expired booking
    await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        confirmation_token: null,
        confirmation_expires_at: null,
        waitlist_position: null,
      })
      .eq('id', booking.id)

    // Fetch class start time
    const { data: instance } = await supabase
      .from('class_instances')
      .select('starts_at')
      .eq('id', booking.instance_id)
      .single()

    if (instance?.starts_at) {
      await promoteNextWaitlistMember(supabase, booking.instance_id, instance.starts_at, appUrl)
    }

    processed++
  }

  return NextResponse.json({ processed })
}
