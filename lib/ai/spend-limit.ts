// lib/ai/spend-limit.ts
//
// Per-gym monthly AI call ceiling.
//
// The limit is read from AI_MONTHLY_LIMIT (default 50). Each AI-generating
// endpoint calls checkAiLimit() before the call and incrementAiCalls() after
// a successful response. The month is tracked lazily — no cron required;
// the counter resets automatically when a new YYYY-MM is detected.
//
// Both functions accept the caller's user-scoped Supabase client so they
// operate under RLS (owner can read/update their own gym row). The admin
// client is not needed here — auth is already verified by the route handler.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Validate env var strictly: reject non-finite or non-positive values rather
// than silently treating NaN as "no limit" (NaN >= anything is always false).
const raw = process.env.AI_MONTHLY_LIMIT ?? '50'
const parsed = Number(raw)
const LIMIT = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 50

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

/**
 * Returns { limited: true } if this gym has reached its monthly AI call cap.
 * Must be called before the AI request is made.
 * Fails closed: if the gym row cannot be found, blocks the call rather than
 * silently allowing unbounded AI usage.
 */
export async function checkAiLimit(
  gymId: string,
  supabase: SupabaseClient<Database>
): Promise<{ limited: boolean }> {
  const { data, error } = await supabase
    .from('gyms')
    .select('ai_calls_this_month, ai_month')
    .eq('id', gymId)
    .single()

  if (error) {
    // Transient DB error (pooling hiccup, 5xx) — allow rather than block.
    // Blocking on infrastructure errors would deny AI to all gyms during any
    // Supabase outage. Log for alerting, but don't penalise the user.
    console.error('[ai/spend-limit] read error for', gymId, error)
    return { limited: false }
  }

  if (!data) {
    // Row genuinely missing (deleted gym, misconfigured request) — block.
    console.error('[ai/spend-limit] gym row not found for', gymId, '— blocking AI call')
    return { limited: true }
  }

  const month = currentMonth()
  const count = data.ai_month === month ? (data.ai_calls_this_month ?? 0) : 0
  return { limited: count >= LIMIT }
}

/**
 * Increments the AI call counter for this gym, resetting if the month rolled over.
 * A slight read-modify-write race is acceptable — the rate-limit already caps
 * concurrent calls, and a single over-count at the boundary is harmless.
 * Call only after a successful AI response.
 */
export async function incrementAiCalls(
  gymId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const month = currentMonth()

  const { data } = await supabase
    .from('gyms')
    .select('ai_calls_this_month, ai_month')
    .eq('id', gymId)
    .single()

  if (!data) return

  if (data.ai_month === month) {
    await supabase
      .from('gyms')
      .update({ ai_calls_this_month: (data.ai_calls_this_month ?? 0) + 1 })
      .eq('id', gymId)
  } else {
    await supabase
      .from('gyms')
      .update({ ai_calls_this_month: 1, ai_month: month })
      .eq('id', gymId)
  }
}
