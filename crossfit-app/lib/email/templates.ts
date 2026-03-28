// lib/email/templates.ts
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function bookingConfirmedHtml(name: string, date: string, time: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">Booking Confirmed</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your spot is confirmed for <strong>${escapeHtml(date)}</strong> at <strong>${escapeHtml(time)}</strong>.</p>
    <p style="color:#9CA3AF;font-size:12px">Cancel up to 1 hour before class.</p>
  </div>`
}

export function waitlistPromotionHtml(name: string, date: string, time: string, confirmUrl: string, expiresIn: string) {
  const safeConfirmUrl = confirmUrl.startsWith('https://') ? escapeHtml(confirmUrl) : '#'
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">Spot Available</h2>
    <p>Hi ${escapeHtml(name)}, a spot opened for <strong>${escapeHtml(date)}</strong> at <strong>${escapeHtml(time)}</strong>.</p>
    <p>Confirm within <strong>${escapeHtml(expiresIn)}</strong>:</p>
    <a href="${safeConfirmUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#D4AF37;color:#000;text-decoration:none;border-radius:4px;font-weight:600">Confirm My Spot</a>
  </div>`
}

export function workoutsPublishedHtml(gymName: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">This Week's Workouts Are Live</h2>
    <p>${escapeHtml(gymName)} has published the workouts for this week. Log in to view and book your classes.</p>
  </div>`
}

export function memberInvitedHtml(gymName: string, inviteUrl: string) {
  const safeInviteUrl = inviteUrl.startsWith('https://') ? escapeHtml(inviteUrl) : '#'
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">You're Invited</h2>
    <p>You've been invited to join <strong>${escapeHtml(gymName)}</strong>.</p>
    <a href="${safeInviteUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#D4AF37;color:#000;text-decoration:none;border-radius:4px;font-weight:600">Accept Invite</a>
  </div>`
}

export function accessRestoredHtml(name: string, gymName: string, loginUrl: string) {
  const safeLoginUrl = loginUrl.startsWith('https://') ? escapeHtml(loginUrl) : '#'
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">Access Restored</h2>
    <p>Hi ${escapeHtml(name)}, your access to <strong>${escapeHtml(gymName)}</strong> has been restored.</p>
    <a href="${safeLoginUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#D4AF37;color:#000;text-decoration:none;border-radius:4px;font-weight:600">Log In</a>
  </div>`
}

export function bookingCancelledHtml(name: string, date: string, time: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">Booking Cancelled</h2>
    <p>Hi ${escapeHtml(name)}, your booking for <strong>${escapeHtml(date)}</strong> at <strong>${escapeHtml(time)}</strong> has been cancelled.</p>
  </div>`
}
