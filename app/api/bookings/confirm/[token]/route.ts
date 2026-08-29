// app/api/bookings/confirm/[token]/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'
import { verifyToken } from '@/lib/crypto/token'
import { randomBytes, timingSafeEqual } from 'crypto'

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

  // Generate a short-lived CSRF double-submit cookie.
  // The same value is embedded in the form as a hidden field.
  // The POST handler checks cookie === field before mutating.
  const csrf = randomBytes(16).toString('hex')

  const res = new Response(
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
      <input type="hidden" name="_kova_confirm_csrf" value="${csrf}" />
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
        // SameSite=Strict: browser sends the cookie only on same-site navigations,
        // so a cross-site form submit won't include it — but the hidden field still
        // won't match because the attacker never saw the GET response.
        // Secure: enforce HTTPS-only delivery regardless of where the app runs.
        // Scoped to this specific token path so multiple pending confirmations
        // don't overwrite each other's cookies (R5).
        'Set-Cookie': `_kova_confirm_csrf=${csrf}; HttpOnly; Secure; SameSite=Strict; Path=/api/bookings/confirm/${token}; Max-Age=900`,
      },
    }
  )
  return res
}

/**
 * POST — performs the actual booking confirmation mutation.
 * Triggered by the user clicking "Confirm my spot" on the GET interstitial.
 */
export async function POST(req: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params
  // All DB operations in this route use the admin client. Security is provided
  // by HMAC token verification + CSRF double-submit cookie; we must not rely on
  // the user being logged in (they clicked from email). The narrowed member RLS
  // (migration 022) only permits flip-to-cancelled, which would block the
  // confirmed status update if we used the cookie-bound client.
  const supabase = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // CSRF double-submit cookie check: the hidden _csrf field in the form must
  // match the _csrf cookie set on the GET response. Automated bots that follow
  // the form action without first rendering the GET page will fail this check.
  const cookieHeader = req.headers.get('cookie') ?? ''
  const cookieCsrf = cookieHeader.match(/(?:^|;\s*)_kova_confirm_csrf=([^;]+)/)?.[1] ?? ''
  const formData = await req.formData().catch(() => null)
  const formCsrf = formData?.get('_kova_confirm_csrf')?.toString() ?? ''
  // timingSafeEqual prevents timing-side-channel attacks. Both buffers must be
  // the same length; if either is empty the fast-path check short-circuits first.
  const csrfMatch = cookieCsrf.length > 0 && formCsrf.length > 0 &&
    cookieCsrf.length === formCsrf.length &&
    timingSafeEqual(Buffer.from(cookieCsrf), Buffer.from(formCsrf))
  if (!csrfMatch) {
    return NextResponse.redirect(`${appUrl}/my-schedule?error=invalid-token`)
  }

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

  // Expired? Use expire_pending_confirmation RPC (migration 063): idempotent
  // cancel scoped to pending_confirmation status; returns whether it acted so
  // we avoid double-promotion if another process beat us.
  if (new Date(booking.confirmation_expires_at!).getTime() < Date.now()) {
    const { data: expireResult, error: expireErr } = await supabase
      .rpc('expire_pending_confirmation' as never, { p_booking_id: booking.id } as never)

    if (expireErr) {
      console.error('[confirm] expire_pending_confirmation rpc failed', expireErr)
      return NextResponse.redirect(`${appUrl}/my-schedule?error=server-error`)
    }

    const expired = expireResult as { cancelled: boolean; instance_id: string | null }
    if (expired?.cancelled) {
      await promoteNextWaitlistMember(createAdminClient(), booking.instance_id, instance.starts_at, appUrl, getTimezone(instance))
    }
    return NextResponse.redirect(`${appUrl}/my-schedule?error=confirmation-expired`)
  }

  // confirm_pending_booking RPC (migration 063): atomically re-checks capacity
  // and flips pending_confirmation → confirmed under a FOR UPDATE lock on the
  // class_instances row.  Eliminates the TOCTOU between a separate capacity
  // SELECT and the UPDATE that existed before this migration.
  const { data: confirmResult, error: confirmError } = await supabase
    .rpc('confirm_pending_booking' as never, { p_booking_id: booking.id, p_instance_id: booking.instance_id } as never)

  if (confirmError) {
    console.error('[confirm] confirm_pending_booking rpc failed', confirmError)
    return NextResponse.redirect(`${appUrl}/my-schedule?error=server-error`)
  }

  const r = confirmResult as { confirmed: boolean; cancelled: boolean; reason: string | null }

  if (r.reason === 'class_full') {
    if (r.cancelled) {
      await promoteNextWaitlistMember(createAdminClient(), booking.instance_id, instance.starts_at, appUrl, getTimezone(instance))
    }
    return NextResponse.redirect(`${appUrl}/my-schedule?error=class-filled`)
  }

  if (!r.confirmed) {
    return NextResponse.redirect(`${appUrl}/my-schedule?error=invalid-token`)
  }

  return NextResponse.redirect(`${appUrl}/my-schedule?confirmed=true`)
}
