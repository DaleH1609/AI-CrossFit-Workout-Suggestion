// lib/email/send.ts
import { Resend } from 'resend'
import {
  bookingConfirmedHtml, waitlistPromotionHtml,
  workoutsPublishedHtml, memberInvitedHtml, bookingCancelledHtml
} from './templates'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@yourgym.com'

export async function sendBookingConfirmed(to: string, name: string, date: string, time: string) {
  await resend.emails.send({ from: FROM, to, subject: 'Booking Confirmed', html: bookingConfirmedHtml(name, date, time) })
}

export async function sendWaitlistPromotion(to: string, name: string, date: string, time: string, confirmUrl: string, expiresIn: string) {
  await resend.emails.send({ from: FROM, to, subject: 'Spot Available — Confirm Now', html: waitlistPromotionHtml(name, date, time, confirmUrl, expiresIn) })
}

export async function sendWorkoutsPublishedEmail(members: { email: string; name: string }[], gymName = 'Your Gym') {
  await Promise.allSettled(
    members.map(m => resend.emails.send({ from: FROM, to: m.email, subject: "This Week's Workouts Are Live", html: workoutsPublishedHtml(gymName) }))
  )
}

export async function sendMemberInvite(to: string, gymName: string, inviteUrl: string) {
  await resend.emails.send({ from: FROM, to, subject: `You're invited to ${gymName}`, html: memberInvitedHtml(gymName, inviteUrl) })
}

export async function sendBookingCancelled(to: string, name: string, date: string, time: string) {
  await resend.emails.send({ from: FROM, to, subject: 'Booking Cancelled', html: bookingCancelledHtml(name, date, time) })
}
