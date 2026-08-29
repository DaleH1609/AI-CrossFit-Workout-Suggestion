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
  await getResend().emails.send({ from: getFrom(), to, subject: 'Booking Confirmed', html: await bookingConfirmedHtml(name, date, time), ...withReplyTo(contactEmail) })
}

export async function sendWaitlistPromotion(to: string, name: string, date: string, time: string, confirmUrl: string, expiresIn: string, contactEmail?: string | null) {
  await getResend().emails.send({ from: getFrom(), to, subject: 'Spot Available - Confirm Now', html: await waitlistPromotionHtml(name, date, time, confirmUrl, expiresIn), ...withReplyTo(contactEmail) })
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
  const html = await workoutsPublishedHtml(gymName)
  const results = await Promise.allSettled(
    members.map(m =>
      resend.emails.send({
        from,
        to: m.email,
        subject: "This Week's Workouts Are Live",
        html,
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
  await getResend().emails.send({ from: getFrom(), to, subject: `You're invited to ${gymName}`, html: await memberInvitedHtml(gymName, inviteUrl) })
}

export async function sendBookingCancelled(to: string, name: string, date: string, time: string, contactEmail?: string | null) {
  await getResend().emails.send({ from: getFrom(), to, subject: 'Booking Cancelled', html: await bookingCancelledHtml(name, date, time), ...withReplyTo(contactEmail) })
}

export async function sendAccessRestored(to: string, name: string, gymName: string, loginUrl: string) {
  await getResend().emails.send({ from: getFrom(), to, subject: 'Your gym access has been restored', html: await accessRestoredHtml(name, gymName, loginUrl) })
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
  return `<div style="font-family:Inter,sans-serif;background:#070708;color:#fff;padding:32px;max-width:560px">
    <h2 style="color:#C6F24E;font-family:Georgia,serif;margin-top:0">${escapeHtmlInline(gymName)}</h2>
    <p>Hi ${escapeHtmlInline(name)},</p>
    <div style="margin:16px 0;line-height:1.6">${bodyHtml}</div>
    <p style="color:#6B7280;font-size:11px;margin-top:32px">You're receiving this because you're a member of ${escapeHtmlInline(gymName)}.</p>
  </div>`
}

function escapeHtmlInline(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

// Lead nurture emails
export async function sendLeadWelcome(to: string, name: string | null, gymName: string, contactEmail?: string | null) {
  const displayName = name || 'there'
  await getResend().emails.send({
    from: getFrom(),
    subject: `Thanks for your interest in ${gymName}`,
    to,
    html: `<div style="font-family:Inter,sans-serif;background:#070708;color:#fff;padding:32px;max-width:560px">
      <h2 style="color:#C6F24E;font-family:Georgia,serif;margin-top:0">${escapeHtmlInline(gymName)}</h2>
      <p>Hi ${escapeHtmlInline(displayName)},</p>
      <p>Thanks for reaching out! We got your details and someone from our team will be in touch soon to book your first class.</p>
      <p style="color:#9CA3AF">In the meantime, feel free to reply to this email if you have any questions.</p>
      <p style="color:#6B7280;font-size:11px;margin-top:32px">${escapeHtmlInline(gymName)}</p>
    </div>`,
    ...withReplyTo(contactEmail),
  })
}

export async function sendLeadOwnerAlert(to: string, leadName: string | null, leadEmail: string, gymName: string) {
  await getResend().emails.send({
    from: getFrom(),
    subject: `New lead: ${leadEmail}`,
    to,
    html: `<div style="font-family:Inter,sans-serif;background:#070708;color:#fff;padding:32px;max-width:560px">
      <h2 style="color:#C6F24E;font-family:Georgia,serif;margin-top:0">${escapeHtmlInline(gymName)} - New Lead</h2>
      <p>A new lead signed up from your website:</p>
      <ul style="margin:8px 0;padding-left:20px;line-height:2">
        ${leadName ? `<li><strong>Name:</strong> ${escapeHtmlInline(leadName)}</li>` : ''}
        <li><strong>Email:</strong> ${escapeHtmlInline(leadEmail)}</li>
      </ul>
      <p>Log in to your dashboard to follow up.</p>
    </div>`,
  })
}

export async function sendLeadTrialBooked(to: string, name: string | null, gymName: string, trialDate: string | null, contactEmail?: string | null) {
  const displayName = name || 'there'
  const dateStr = trialDate ? new Date(trialDate + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : 'soon'
  await getResend().emails.send({
    from: getFrom(),
    subject: `Your trial class is booked - ${gymName}`,
    to,
    html: `<div style="font-family:Inter,sans-serif;background:#070708;color:#fff;padding:32px;max-width:560px">
      <h2 style="color:#C6F24E;font-family:Georgia,serif;margin-top:0">${escapeHtmlInline(gymName)}</h2>
      <p>Hi ${escapeHtmlInline(displayName)},</p>
      <p>Great news - your trial class is booked for <strong>${escapeHtmlInline(dateStr)}</strong>. We can't wait to see you!</p>
      <p>Wear comfortable workout clothes. Arrive 5-10 minutes early so we can show you around. Bring water.</p>
      <p style="color:#9CA3AF">Any questions? Just reply to this email.</p>
      <p style="color:#6B7280;font-size:11px;margin-top:32px">${escapeHtmlInline(gymName)}</p>
    </div>`,
    ...withReplyTo(contactEmail),
  })
}

export async function sendAccessRevoked(to: string, name: string) {
  await getResend().emails.send({
    from: getFrom(),
    to,
    subject: 'Your gym access has been removed',
    html: await accessRevokedHtml(name),
  })
}

export async function sendDeletionRequestAlert(to: string, memberName: string | null, memberEmail: string, gymName: string) {
  await getResend().emails.send({
    from: getFrom(),
    subject: `Account deletion request - ${memberEmail}`,
    to,
    html: `<div style="font-family:Inter,sans-serif;background:#070708;color:#fff;padding:32px;max-width:560px">
      <h2 style="color:#C6F24E;font-family:Georgia,serif;margin-top:0">${escapeHtmlInline(gymName)} - Deletion Request</h2>
      <p>A member has requested deletion of their account under GDPR Art. 17 (right to erasure):</p>
      <ul style="margin:8px 0;padding-left:20px;line-height:2">
        ${memberName ? `<li><strong>Name:</strong> ${escapeHtmlInline(memberName)}</li>` : ''}
        <li><strong>Email:</strong> ${escapeHtmlInline(memberEmail)}</li>
      </ul>
      <p>Log in to your dashboard and navigate to <strong>Members</strong> to review and action this request.</p>
      <p style="color:#6B7280;font-size:11px;margin-top:32px">You must action this request within 30 days to comply with GDPR.</p>
    </div>`,
  })
}
