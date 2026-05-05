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

/**
 * GET — returns an HTML interstitial requiring a user click before confirming.
 *
 * This prevents email scanners, link prefetchers (Gmail, SafeLinks, Slack, etc.)
 * and IM preview bots from accidentally triggering the confirmation mutation.
 * Only the token signature is verified here — no DB mutation occurs on GET.
 */
export async function GET(_req: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const verified = verifyToken(token)
  if (!verified) {
    return NextResponse.redirect(`${appUrl}/my-schedule?error=invalid-token`)
  }

  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Confirm your booking — KOVA</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0d0d0d; color: #e5e5e5;
      min-height: 100vh; display: flex; align-items: center;
      justify-content: center; padding: 24px;
    }
    .card {
      background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 16px;
      padding: 40px; max-width: 400px; width: 100%; text-align: center;
    }
    .logo { font-size: 11px; font-weight: 700; letter-spacing: 0.2em;
      text-transform: uppercase; color: #b8952a; margin-bottom: 28px; }
    h1 { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 10px; }
    p { font-size: 14px; color: #888; line-height: 1.6; margin-bottom: 32px; }
    button {
      width: 100%; padding: 14px; background: #b8952a; color: #000;
      font-size: 12px; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; border: none; border-radius: 8px; cursor: pointer;
    }
    button:hover { background: #a8851a; }
  </style>
</head>
<body>
  <div class="card">
    <p class="logo">KOVA</p>
    <h1>Confirm your spot?</h1>
    <p>Click the button below to confirm your booking. Your spot is held until you confirm.</p>
    <form method="POST">
      <button type="submit">Confirm my spot →</button>
    </form>
  </div>
</body>
</html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  )
}

/**
 * POST — performs the actual booking confirmation mutation.
 * Triggered by the user clicking "Confirm my spot" on the GET interstitial.
 */
export async function POST(_req: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params
  const supabase = await createClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const verified = verifyToken(token)
  if (!verified) {
    return NextResponse.redirect(`${appUrl}/my-schedule?error=invalid-token`)
  }

  const { data: booking } = await supabase.from('bookings')
    .select('id, instance_id, confirmation_expires_at, status, class_instances(starts_at, capacity, gyms(timezone))')
    .eq('id', verified.bookingId)
    .eq('status', 'pending_confirmation')
    .maybeSingle<BookingRow>()

  if (!booking) {
    return NextResponse.redirect(`${appUrl}/my-schedule?error=invalid-token`)
  }

  const instance = getInstance(booking)
  if (!instance) {
    return NextResponse.redirect(`${appUrl}/my-schedule?error=server-error`)
  }

  // Expired? Cancel and pass to next waitlisted member.
  if (new Date(booking.confirmation_expires_at!).getTime() < Date.now()) {
    const { data: cancelRows, error: cancelErr } = await supabase.from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        waitlist_position: null,
        confirmation_expires_at: null,
      })
      .eq('id', booking.id)
      .eq('status', 'pending_confirmation')
      .select('id')

    if (cancelErr) {
      console.error('[confirm] expire-cancel failed', cancelErr)
      return NextResponse.redirect(`${appUrl}/my-schedule?error=server-error`)
    }

    if (cancelRows && cancelRows.length > 0) {
      await promoteNextWaitlistMember(supabase, booking.instance_id, instance.starts_at, appUrl, getTimezone(instance))
    }
    return NextResponse.redirect(`${appUrl}/my-schedule?error=confirmation-expired`)
  }

  // Re-check capacity at confirmation time.
  const { count: confirmedCount } = await supabase.from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('instance_id', booking.instance_id)
    .eq('status', 'confirmed')

  if ((confirmedCount ?? 0) >= instance.capacity) {
    await supabase.from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
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
    return NextResponse.redirect(`${appUrl}/my-schedule?error=invalid-token`)
  }

  return NextResponse.redirect(`${appUrl}/my-schedule?confirmed=true`)
}
