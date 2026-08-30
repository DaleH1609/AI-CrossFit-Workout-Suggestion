// tests/lib/ai/spend-limit.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

/**
 * The monthly AI ceiling. Its two failure branches point in opposite
 * directions on purpose, and the distinction is easy to flatten by accident:
 *
 *   transient database error → allow, because blocking would deny AI to every
 *                              gym during any Supabase wobble;
 *   gym row genuinely absent → block, because a request naming a gym that does
 *                              not exist should not be granted a quota.
 *
 * LIMIT is read from env once at module load, so cases that vary it reset the
 * module registry and re-import.
 */

const ORIGINAL_LIMIT = process.env.AI_MONTHLY_LIMIT

beforeEach(() => {
  vi.resetModules()
  delete process.env.AI_MONTHLY_LIMIT
})

afterEach(() => {
  if (ORIGINAL_LIMIT === undefined) delete process.env.AI_MONTHLY_LIMIT
  else process.env.AI_MONTHLY_LIMIT = ORIGINAL_LIMIT
})

/** Minimal stand-in for the one query checkAiLimit makes. */
function clientReturning(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result)
  const eq = vi.fn(() => ({ single }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { from } as unknown as SupabaseClient<Database>
}

const thisMonth = () => new Date().toISOString().slice(0, 7)

async function load() {
  return await import('@/lib/ai/spend-limit')
}

describe('checkAiLimit', () => {
  it('allows a gym below the ceiling', async () => {
    const { checkAiLimit } = await load()
    const supabase = clientReturning({
      data: { ai_calls_this_month: 3, ai_month: thisMonth() }, error: null,
    })
    expect(await checkAiLimit('gym-1', supabase)).toEqual({ limited: false })
  })

  it('blocks once the ceiling is reached', async () => {
    const { checkAiLimit } = await load()
    const supabase = clientReturning({
      data: { ai_calls_this_month: 50, ai_month: thisMonth() }, error: null,
    })
    expect(await checkAiLimit('gym-1', supabase)).toEqual({ limited: true })
  })

  it('ignores a count carried over from a previous month', async () => {
    // The reset is lazy — no cron. If a stale month were not discarded, a gym
    // that hit the ceiling in August would still be blocked in September.
    const { checkAiLimit } = await load()
    const supabase = clientReturning({
      data: { ai_calls_this_month: 9999, ai_month: '2020-01' }, error: null,
    })
    expect(await checkAiLimit('gym-1', supabase)).toEqual({ limited: false })
  })

  it('treats a null count as zero', async () => {
    const { checkAiLimit } = await load()
    const supabase = clientReturning({
      data: { ai_calls_this_month: null, ai_month: thisMonth() }, error: null,
    })
    expect(await checkAiLimit('gym-1', supabase)).toEqual({ limited: false })
  })

  it('allows through a transient database error', async () => {
    const { checkAiLimit } = await load()
    const supabase = clientReturning({ data: null, error: { message: 'pooling hiccup' } })
    expect(await checkAiLimit('gym-1', supabase)).toEqual({ limited: false })
  })

  it('blocks when the gym row is genuinely missing', async () => {
    // The opposite branch to the one above, and the reason they cannot be
    // collapsed into a single catch-all.
    const { checkAiLimit } = await load()
    const supabase = clientReturning({ data: null, error: null })
    expect(await checkAiLimit('gym-1', supabase)).toEqual({ limited: true })
  })

  it('honours AI_MONTHLY_LIMIT', async () => {
    process.env.AI_MONTHLY_LIMIT = '2'
    const { checkAiLimit } = await load()
    const at = clientReturning({ data: { ai_calls_this_month: 2, ai_month: thisMonth() }, error: null })
    expect(await checkAiLimit('gym-1', at)).toEqual({ limited: true })
  })

  it('falls back to the default when the env var is nonsense', async () => {
    // Number('abc') is NaN, and NaN >= anything is false — so an unvalidated
    // env var would read as "no limit at all" rather than as a bad value.
    process.env.AI_MONTHLY_LIMIT = 'abc'
    const { checkAiLimit } = await load()
    const over = clientReturning({ data: { ai_calls_this_month: 50, ai_month: thisMonth() }, error: null })
    expect(await checkAiLimit('gym-1', over)).toEqual({ limited: true })
  })
})

describe('incrementAiCalls', () => {
  it('records the month and defaults missing token counts to zero', async () => {
    const { incrementAiCalls } = await load()
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
    const supabase = { rpc } as unknown as SupabaseClient<Database>

    await incrementAiCalls('gym-1', supabase, { inputTokens: 120, outputTokens: 45 })
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_gym_id: 'gym-1', p_month: thisMonth(), p_input_tokens: 120, p_output_tokens: 45,
    })

    await incrementAiCalls('gym-1', supabase)
    expect(rpc.mock.calls[1][1]).toMatchObject({ p_input_tokens: 0, p_output_tokens: 0 })
  })
})
