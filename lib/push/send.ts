// lib/push/send.ts
// Server-side web push sender using VAPID + web-push
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

// Initialise VAPID keys from env (set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_MAILTO)
function initWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const mailto = process.env.VAPID_MAILTO ?? 'mailto:admin@kova.app'
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(mailto, publicKey, privateKey)
  return true
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

interface SubscriptionRow {
  endpoint: string
  p256dh: string
  auth_key: string
}

async function deliverAndPrune(
  supabase: ReturnType<typeof createAdminClient>,
  subs: SubscriptionRow[],
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (subs.length === 0) return { sent: 0, failed: 0 }

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(payload)
      )
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  // Prune expired subscriptions (410 Gone)
  const expired = results
    .map((r, i) => ({ r, sub: subs[i] }))
    .filter(({ r }) => r.status === 'rejected' && (r as PromiseRejectedResult).reason?.statusCode === 410)

  if (expired.length > 0) {
    await Promise.all(
      expired.map(({ sub }) =>
        supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      )
    )
  }

  return { sent, failed }
}

export async function sendPushToGym(gymId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!initWebPush()) {
    console.warn('[push] VAPID keys not configured — skipping push notifications')
    return { sent: 0, failed: 0 }
  }

  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('gym_id', gymId)

  return deliverAndPrune(supabase, (subs ?? []) as SubscriptionRow[], payload)
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!initWebPush()) return { sent: 0, failed: 0 }

  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('user_id', userId)

  return deliverAndPrune(supabase, (subs ?? []) as SubscriptionRow[], payload)
}
