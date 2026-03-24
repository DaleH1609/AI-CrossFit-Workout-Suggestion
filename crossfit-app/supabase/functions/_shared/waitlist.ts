// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

export function shouldSkipPromotion(startsAt: string): boolean {
  return new Date(startsAt).getTime() - Date.now() <= TWO_HOURS_MS
}

export function getConfirmationWindow(startsAt: string): number {
  const timeUntilClass = new Date(startsAt).getTime() - Date.now()
  return Math.min(TWO_HOURS_MS, timeUntilClass)
}

export async function promoteNextWaitlistMember(
  supabase: ReturnType<typeof createClient>,
  instanceId: string,
  startsAt: string,
  appUrl: string,
  resendApiKey: string
) {
  if (shouldSkipPromotion(startsAt)) return

  const { data: next } = await supabase
    .from('bookings')
    .select('id, user_id, users(email, name)')
    .eq('instance_id', instanceId)
    .eq('status', 'waitlisted')
    .order('waitlist_position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!next) return

  const windowMs = getConfirmationWindow(startsAt)
  const expiresAt = new Date(Date.now() + windowMs).toISOString()
  const token = crypto.randomUUID()

  await supabase.from('bookings').update({
    status: 'pending_confirmation',
    confirmation_token: token,
    confirmation_expires_at: expiresAt,
  }).eq('id', next.id)

  const user = (next as any).users
  const confirmUrl = `${appUrl}/api/bookings/confirm/${token}`
  const expiresIn = windowMs >= TWO_HOURS_MS ? '2 hours' : 'before the class starts'
  const classDate = new Date(startsAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const classTime = new Date(startsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'noreply@yourgym.com',
      to: user.email,
      subject: 'Spot Available — Confirm Now',
      html: `<p>Hi ${user.name}, a spot opened for <strong>${classDate}</strong> at <strong>${classTime}</strong>. Confirm within ${expiresIn}: <a href="${confirmUrl}">Confirm My Spot</a></p>`
    })
  })
}
