// lib/email/templates.ts
//
// T5: Email templates as React components via react-email.
// Variables are auto-escaped by React — no manual escapeHtml() needed.
// Preview with: npx react-email dev  (reads from /emails/*.tsx)

import * as React from 'react'
import { render } from '@react-email/render'
import { BookingConfirmed } from '@/emails/booking-confirmed'
import { WaitlistPromotion } from '@/emails/waitlist-promotion'
import { WorkoutsPublished } from '@/emails/workouts-published'
import { MemberInvited } from '@/emails/member-invited'
import { BookingCancelled } from '@/emails/booking-cancelled'
import { AccessRestored } from '@/emails/access-restored'
import { AccessRevoked } from '@/emails/access-revoked'

export async function bookingConfirmedHtml(name: string, date: string, time: string): Promise<string> {
  return render(React.createElement(BookingConfirmed, { name, date, time }))
}

export async function waitlistPromotionHtml(name: string, date: string, time: string, confirmUrl: string, expiresIn: string): Promise<string> {
  // Only allow https:// confirm URLs — prevents javascript: or data: injection in the email
  const safeUrl = confirmUrl.startsWith('https://') ? confirmUrl : '#'
  return render(React.createElement(WaitlistPromotion, { name, date, time, confirmUrl: safeUrl, expiresIn }))
}

export async function workoutsPublishedHtml(gymName: string): Promise<string> {
  return render(React.createElement(WorkoutsPublished, { gymName }))
}

export async function memberInvitedHtml(gymName: string, inviteUrl: string): Promise<string> {
  const safeUrl = inviteUrl.startsWith('https://') ? inviteUrl : '#'
  return render(React.createElement(MemberInvited, { gymName, inviteUrl: safeUrl }))
}

export async function bookingCancelledHtml(name: string, date: string, time: string): Promise<string> {
  return render(React.createElement(BookingCancelled, { name, date, time }))
}

export async function accessRestoredHtml(name: string, gymName: string, loginUrl: string): Promise<string> {
  const safeUrl = loginUrl.startsWith('https://') ? loginUrl : '#'
  return render(React.createElement(AccessRestored, { name, gymName, loginUrl: safeUrl }))
}

export async function accessRevokedHtml(name: string): Promise<string> {
  return render(React.createElement(AccessRevoked, { name }))
}
