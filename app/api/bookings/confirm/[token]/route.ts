// app/api/bookings/confirm/[token]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'
import { verifyToken } from '@/lib/crypto/token'

interface InstanceRel {
  starts_at: string
  capacity: number
  gyms?: { timezone?: string } | { timezone?: string }[] | null
}
interface BookingRow {
  id: string
  instance_id: string
  confirmation_token: string | null
  confirmation_expires_at: string | null
  status: string
  class_instances: InstanceRel | InstanceRel[] | null
}

function getInstance(b: BookingRow): InstanceRel | null {
  if (!b.class_instances) return null
  if (Array.isArray(b.class_instances)) return b.class_instances[0] ?? null
  return b.class_instances
}

function getTimezone(inst: InstanceRel): string {
  const gymRel = Array.isArray(inst.gyms) ? inst.gyms[0] : inst.gyms
  return gymRel?.timezone ?? 'UTC'
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const supabase = createClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // First try to verify as a signed token. If that works, look up the booking
  // by id (not by token equality) — the stored `confirmation_token` is retained
  // for audit but no longer trusted as the authority.
  const verified = verifyToken(params.token)

  if (!verified) {
    return NextResponse.redirect(`${appUrl}/my-schedule?error=invalid-token`)
  }

  const query = supabase.from('bookings')
      .select('id, instance_id, confirmation_token, confirmation_expires_at, status, class_instances(starts_at, capacity, gyms(timezone))')
      .eq('id', verified.bookingId)
      .eq('status', 'pending_confirmation')
      .maybeSingle<BookingRow>()

  const { data: booking } = await query

  if (!booking) {
    return NextResponse.redirect(`${appUrl}/my-schedule?error=invalid-token`)
  }

  const instance = getInstance(booking)
  if (!instance) {
    return NextResponse.redirect(`${appUrl}/my-schedule?error=server-error`)
  }

  // Expired? Cancel and pass to next waitlisted member.
  if (new Date(booking.confirmation_expires_at!).getTime() < Date.now()) {
    // Idempotent cancel: only flip to cancelled if still pending_confirmation.
    const { data: cancelRows, error: cancelErr } = await supabase.from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        waitlist_position: null,
        confirmation_token: null,
        confirmation_expires_at: null,
      })
      .eq('id', booking.id)
      .eq('status', 'pending_confirmation')
      .select('id')

    if (cancelErr) {
      console.error('[confirm] expire-cancel failed', cancelErr)
      return NextResponse.redirect(`${appUrl}/my-schedule?error=server-error`)
    }

    // Only promote if we actually cancelled it (otherwise someone else did)
    if (cancelRows && cancelRows.length > 0) {
      await promoteNextWaitlistMember(supabase, booking.instance_id, instance.starts_at, appUrl, getTimezone(instance))
    }
    return NextResponse.redirect(`${appUrl}/my-schedule?error=confirmation-expired`)
  }

  // Re-check capacity at confirmation time: between promotion and click, a
  // confirmed member may have cancelled and the spot filled again, or the
  // capacity may have been reduced. Include this booking's own row in the
  // tally (it's still 'pending_confirmation'), so we compare strictly.
  const { count: confirmedCount } = await supabase.from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('instance_id', booking.instance_id)
    .eq('status', 'confirmed')

  if ((confirmedCount ?? 0) >= instance.capacity) {
    // Class filled up — cancel this pending confirmation and notify the user.
    await supabase.from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        confirmation_token: null,
        confirmation_expires_at: null,
        waitlist_position: null,
      })
      .eq('id', booking.id)
      .eq('status', 'pending_confirmation')

    return NextResponse.redirect(`${appUrl}/my-schedule?error=class-filled`)
  }

  // Atomic confirm: only promote pending_confirmation → confirmed.
  const { data: confirmRows, error: confirmUpdateError } = await supabase.from('bookings').update({
    status: 'confirmed',
    confirmation_token: null,
    confirmation_expires_at: null,
    waitlist_position: null,
  })
    .eq('id', booking.id)
    .eq('status', 'pending_confirmation')
    .select('id')

  if (confirmUpdateError) {
    console.error('[confirm] confirm update failed', confirmUpdateError)
    return NextResponse.redirect(`${appUrl}/my-schedule?error=server-error`)
  }

  if (!confirmRows || confirmRows.length === 0) {
    // Already confirmed, cancelled, or expired — treat as already-handled.
    return NextResponse.redirect(`${appUrl}/my-schedule?error=invalid-token`)
  }

  return NextResponse.redirect(`${appUrl}/my-schedule?confirmed=true`)
}
