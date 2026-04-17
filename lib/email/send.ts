// lib/email/send.ts
import { Resend } from 'resend'
import {
  bookingConfirmedHtml, waitlistPromotionHtml,
  workoutsPublishedHtml, memberInvitedHtml, bookingCancelledHtml, accessRestoredHtml,
  accessRevokedHtml,
} from './templates'

/**
 * getResend — lazily construct a single Resend client per process.
 *
 * Previously `new Resend(process.env.RESEND_API_KEY)` was called on every
 * send: if the env var was unset we silently built a broken client
 * (Resend(undefined)) and the error surfaced only at the send call. Now we
 * fail loud at first use, and memoize so we don't rebuild the client.
 */
let _resend: Resend | null = null
function getResend(): Resend {
  if (_resend) return _resend
  const key = process.env.RESEND_API_KEY
  if (!key) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  _resend = new Resend(key)
  return _resend
}

function getFrom() {
  return process.env.RESEND_FROM_EMAIL ?? 'noreply@yourgym.com'
}

function withReplyTo(contactEmail: string | null | undefined): Record<string, string> {
  return contactEmail ? { reply_to: contactEmail } : {}
}

export async function sendBookingConfirmed(to: string, name: string, date: string, time: string, contactEmail?: string | null) {
  await getResend().emails.send({ from: getFrom(), to, subject: 'Booking Confirmed', html: bookingConfirmedHtml(name, date, time), ...withReplyTo(contactEmail) })
}

export async function sendWaitlistPromotion(to: string, name: string, date: string, time: string, confirmUrl: string, expiresIn: string, contactEmail?: string | null) {
  await getResend().emails.send({ from: getFrom(), to, subject: 'Spot Available — Confirm Now', html: waitlistPromotionHtml(name, date, time, confirmUrl, expiresIn), ...withReplyTo(contactEmail) })
}

/**
 * Send "workouts published" email to a batch of members.
 *
 * Returns `{ sent, failed }` so the caller can log / alert on partial failure.
 * Previously this used Promise.allSettled() but discarded the results, so
 * broken sends vanished silently.
 */
export async function sendWorkoutsPublishedEmail(
  members: { email: string; name: string }[],
  gymName = 'Your Gym',
  contactEmail?: string | null
): Promise<{ sent: number; failed: number }> {
  const resend = getResend()
  const from = getFrom()
  const extra = withReplyTo(contactEmail)
  const results = await Promise.allSettled(
    members.map(m =>
      resend.emails.send({
        from,
        to: m.email,
        subject: "This Week's Workouts Are Live",
        html: workoutsPublishedHtml(gymName),
        ...extra,
      })
    )
  )
  let sent = 0
  let failed = 0
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled') {
      sent++
    } else {
      failed++
      console.error('[email/workouts-published] send failed', {
        to: members[i]?.email,
        reason: r.reason,
      })
    }
  }
  return { sent, failed }
}

export async function sendMemberInvite(to: string, gymName: string, inviteUrl: string) {
  await getResend().emails.send({ from: getFrom(), to, subject: `You're invited to ${gymName}`, html: memberInvitedHtml(gymName, inviteUrl) })
}

export async function sendBookingCancelled(to: string, name: string, date: string, time: string, contactEmail?: string | null) {
  await getResend().emails.send({ from: getFrom(), to, subject: 'Booking Cancelled', html: bookingCancelledHtml(name, date, time), ...withReplyTo(contactEmail) })
}

export async function sendAccessRestored(to: string, name: string, gymName: string, loginUrl: string) {
  await getResend().emails.send({ from: getFrom(), to, subject: 'Your gym access has been restored', html: accessRestoredHtml(name, gymName, loginUrl) })
}

/**
 * Send "access revoked" email.
 *
 * Previously this was done inline in app/api/members/revoke/route.ts with an
 * unescaped HTML template (XSS if a member picks a malicious name). Moving
 * here lets us reuse the HTML-escaping templates helper.
 */
export async function sendAccessRevoked(to: string, name: string) {
  await getResend().emails.send({
    from: getFrom(),
    to,
    subject: 'Your gym access has been removed',
    html: accessRevokedHtml(name),
  })
}
