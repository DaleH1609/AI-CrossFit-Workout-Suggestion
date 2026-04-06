// lib/email/send.ts
import { Resend } from 'resend'
import {
  bookingConfirmedHtml, waitlistPromotionHtml,
  workoutsPublishedHtml, memberInvitedHtml, bookingCancelledHtml, accessRestoredHtml
} from './templates'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function getFrom() {
  return process.env.RESEND_FROM_EMAIL ?? 'noreply@yourgym.com'
}

export async function sendBookingConfirmed(to: string, name: string, date: string, time: string) {
  await getResend().emails.send({ from: getFrom(), to, subject: 'Booking Confirmed', html: bookingConfirmedHtml(name, date, time) })
}

export async function sendWaitlistPromotion(to: string, name: string, date: string, time: string, confirmUrl: string, expiresIn: string) {
  await getResend().emails.send({ from: getFrom(), to, subject: 'Spot Available — Confirm Now', html: waitlistPromotionHtml(name, date, time, confirmUrl, expiresIn) })
}

export async function sendWorkoutsPublishedEmail(members: { email: string; name: string }[], gymName = 'Your Gym') {
  const resend = getResend()
  const from = getFrom()
  await Promise.allSettled(
    members.map(m => resend.emails.send({ from, to: m.email, subject: "This Week's Workouts Are Live", html: workoutsPublishedHtml(gymName) }))
  )
}

export async function sendMemberInvite(to: string, gymName: string, inviteUrl: string) {
  await getResend().emails.send({ from: getFrom(), to, subject: `You're invited to ${gymName}`, html: memberInvitedHtml(gymName, inviteUrl) })
}

export async function sendBookingCancelled(to: string, name: string, date: string, time: string) {
  await getResend().emails.send({ from: getFrom(), to, subject: 'Booking Cancelled', html: bookingCancelledHtml(name, date, time) })
}

export async function sendAccessRestored(to: string, name: string, gymName: string, loginUrl: string) {
  await getResend().emails.send({ from: getFrom(), to, subject: 'Your gym access has been restored', html: accessRestoredHtml(name, gymName, loginUrl) })
}
