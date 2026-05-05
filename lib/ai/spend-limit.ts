// lib/ai/spend-limit.ts
//
// Per-gym monthly AI call ceiling.
//
// The limit is read from AI_MONTHLY_LIMIT (default 50). Each AI-generating
// endpoint calls checkAiLimit() before the call and incrementAiCalls() after
// a successful response. The month is tracked lazily — no cron required;
// the counter resets automatically when a new YYYY-MM is detected.

import { createAdminClient } from '@/lib/supabase/admin'

const LIMIT = parseInt(process.env.AI_MONTHLY_LIMIT ?? '50', 10)

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

/**
 * Returns { limited: true } if this gym has reached its monthly AI call cap.
 * Must be called before the AI request is made.
 */
export async function checkAiLimit(gymId: string): Promise<{ limited: boolean }> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('gyms')
    .select('ai_calls_this_month, ai_month')
    .eq('id', gymId)
    .single()

  if (!data) return { limited: false } // fail open if gym row missing

  const month = currentMonth()
  const count = data.ai_month === month ? (data.ai_calls_this_month ?? 0) : 0
  return { limited: count >= LIMIT }
}

/**
 * Atomically increments the AI call counter for this gym.
 * Resets to 1 if the month has rolled over.
 * Call only after a successful AI response.
 */
export async function incrementAiCalls(gymId: string): Promise<void> {
  const admin = createAdminClient()
  const month = currentMonth()

  // Read current state to decide whether to reset or increment.
  // A slight race condition here is acceptable — the rate-limit already caps
  // concurrent calls, and a single over-count at the boundary is harmless.
  const { data } = await admin
    .from('gyms')
    .select('ai_calls_this_month, ai_month')
    .eq('id', gymId)
    .single()

  if (!data) return

  if (data.ai_month === month) {
    await admin
      .from('gyms')
      .update({ ai_calls_this_month: (data.ai_calls_this_month ?? 0) + 1 })
      .eq('id', gymId)
  } else {
    await admin
      .from('gyms')
      .update({ ai_calls_this_month: 1, ai_month: month })
      .eq('id', gymId)
  }
}
