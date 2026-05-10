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
  const addr = process.env.RESEND_FROM_EMAIL
  if (!addr) {
    // Fail loud rather than sending from a placeholder domain that Resend
    // will reject anyway. Every environment that sends email must configure
    // RESEND_FROM_EMAIL to a verified sender on their Resend account.
    throw new Error('RESEND_FROM_EMAIL is not configured')
  }
  return addr
}

function withReplyTo(contactEmail: string | null | undefined): Record<string, string> {
  if (!contactEmail) return {}
  // Reject control characters (header injection) and anything that isn't a
  // plausible email address before setting the reply-to header.
  if (/[\x00-\x1F\x7F]/.test(contactEmail)) return {}
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) return {}
  return { reply_to: contactEmail }
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
export async function sendBroadcast(
  members: { email: string; name: string }[],
  subject: string,
  bodyHtml: string,
  gymName: string,
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
        subject,
        html: broadcastHtml(m.name, bodyHtml, gymName),
        ...extra,
      })
    )
  )
  let sent = 0, failed = 0
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') { sent++ }
    else {
      failed++
      console.error('[email/broadcast] send failed', { to: members[i]?.email, reason: (results[i] as PromiseRejectedResult).reason })
    }
  }
  return { sent, failed }
}

function broadcastHtml(name: string, bodyHtml: string, gymName: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:560px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif;margin-top:0">${escapeHtmlInline(gymName)}</h2>
    <p>Hi ${escapeHtmlInline(name)},</p>
    <div style="margin:16px 0;line-height:1.6">${bodyHtml}</div>
    <p style="color:#6B7280;font-size:11px;margin-top:32px">You're receiving this because you're a member of ${escapeHtmlInline(gymName)}.</p>
  </div>`
}

function escapeHtmlInline(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

export async function sendAccessRevoked(to: string, name: string) {
  await getResend().emails.send({
    from: getFrom(),
    to,
    subject: 'Your gym access has been removed',
    html: accessRevokedHtml(name),
  })
}
