// lib/webhooks/dispatch.ts
// Fire-and-forget webhook delivery for gym integrations
import { createAdminClient } from '@/lib/supabase/admin'

export type WebhookEvent = 'workout_published' | 'booking_confirmed' | 'booking_cancelled' | 'new_member'

interface WebhookPayload {
  event: WebhookEvent
  gym_id: string
  data: Record<string, unknown>
}

interface WebhookRow {
  id: string
  platform: string
  url: string
  events: string[]
}

function buildSlackBody(payload: WebhookPayload): Record<string, unknown> {
  const { event, data } = payload
  const messages: Record<WebhookEvent, string> = {
    workout_published: `💪 *New workout published* for the week of ${data.weekStart ?? ''}`,
    booking_confirmed: `✅ ${data.memberName ?? 'A member'} booked the *${data.className ?? 'class'}* at ${data.classTime ?? ''}`,
    booking_cancelled: `❌ ${data.memberName ?? 'A member'} cancelled their booking for *${data.className ?? 'class'}* at ${data.classTime ?? ''}`,
    new_member: `🎉 *New member joined:* ${data.memberEmail ?? 'someone new'}`,
  }
  return { text: messages[event] ?? `Event: ${event}` }
}

function buildDiscordBody(payload: WebhookPayload): Record<string, unknown> {
  const { event, data } = payload
  const content: Record<WebhookEvent, string> = {
    workout_published: `💪 **New workout published** for the week of ${data.weekStart ?? ''}`,
    booking_confirmed: `✅ ${data.memberName ?? 'A member'} booked **${data.className ?? 'class'}** at ${data.classTime ?? ''}`,
    booking_cancelled: `❌ ${data.memberName ?? 'A member'} cancelled their booking for **${data.className ?? 'class'}**`,
    new_member: `🎉 **New member joined:** ${data.memberEmail ?? 'someone new'}`,
  }
  return { content: content[event] ?? `Event: ${event}` }
}

export async function dispatchWebhooks(gymId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  const supabase = createAdminClient()
  const { data: hooks } = await supabase
    .from('gym_webhooks')
    .select('id, platform, url, events')
    .eq('gym_id', gymId)
    .eq('active', true)

  if (!hooks || hooks.length === 0) return

  const payload: WebhookPayload = { event, gym_id: gymId, data }

  await Promise.allSettled(
    (hooks as WebhookRow[])
      .filter(h => h.events.includes(event))
      .map(async hook => {
        const body = hook.platform === 'discord'
          ? buildDiscordBody(payload)
          : hook.platform === 'slack'
          ? buildSlackBody(payload)
          : { event, data }  // generic JSON for custom

        await fetch(hook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      })
  )
}
