// lib/email/templates.ts
export function bookingConfirmedHtml(name: string, date: string, time: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">Booking Confirmed</h2>
    <p>Hi ${name},</p>
    <p>Your spot is confirmed for <strong>${date}</strong> at <strong>${time}</strong>.</p>
    <p style="color:#9CA3AF;font-size:12px">Cancel up to 1 hour before class.</p>
  </div>`
}

export function waitlistPromotionHtml(name: string, date: string, time: string, confirmUrl: string, expiresIn: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">Spot Available</h2>
    <p>Hi ${name}, a spot opened for <strong>${date}</strong> at <strong>${time}</strong>.</p>
    <p>Confirm within <strong>${expiresIn}</strong>:</p>
    <a href="${confirmUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#D4AF37;color:#000;text-decoration:none;border-radius:4px;font-weight:600">Confirm My Spot</a>
  </div>`
}

export function workoutsPublishedHtml(gymName: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">This Week's Workouts Are Live</h2>
    <p>${gymName} has published the workouts for this week. Log in to view and book your classes.</p>
  </div>`
}

export function memberInvitedHtml(gymName: string, inviteUrl: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">You're Invited</h2>
    <p>You've been invited to join <strong>${gymName}</strong>.</p>
    <a href="${inviteUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#D4AF37;color:#000;text-decoration:none;border-radius:4px;font-weight:600">Accept Invite</a>
  </div>`
}

export function bookingCancelledHtml(name: string, date: string, time: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">Booking Cancelled</h2>
    <p>Hi ${name}, your booking for <strong>${date}</strong> at <strong>${time}</strong> has been cancelled.</p>
  </div>`
}
