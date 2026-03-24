// lib/bookings/waitlist.ts
import { sendWaitlistPromotion } from '@/lib/email/send'

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

export function shouldSkipPromotion(startsAt: string): boolean {
  return new Date(startsAt).getTime() - Date.now() <= TWO_HOURS_MS
}

export function getConfirmationWindow(startsAt: string): number {
  const timeUntilClass = new Date(startsAt).getTime() - Date.now()
  return Math.min(TWO_HOURS_MS, timeUntilClass)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function promoteNextWaitlistMember(
  supabase: { from: (table: string) => any },
  instanceId: string,
  startsAt: string,
  appUrl: string
) {
  if (shouldSkipPromotion(startsAt)) return

  // Get next waitlisted member
  const { data: next } = await supabase
    .from('bookings')
    .select('id, user_id, users(email, name)')
    .eq('instance_id', instanceId)
    .eq('status', 'waitlisted')
    .order('waitlist_position', { ascending: true })
    .limit(1)
    .single()

  if (!next) return

  const windowMs = getConfirmationWindow(startsAt)
  const expiresAt = new Date(Date.now() + windowMs).toISOString()
  const token = crypto.randomUUID()

  const { error: updateError } = await (supabase.from('bookings') as any).update({
    status: 'pending_confirmation',
    confirmation_token: token,
    confirmation_expires_at: expiresAt,
  }).eq('id', (next as any).id)
  if (updateError) return

  const user = (next as any).users
  const confirmUrl = `${appUrl}/api/bookings/confirm/${token}`
  const expiresIn = windowMs >= TWO_HOURS_MS ? '2 hours' : 'before the class starts'

  const classDate = new Date(startsAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const classTime = new Date(startsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  await sendWaitlistPromotion(user.email, user.name, classDate, classTime, confirmUrl, expiresIn)
}
