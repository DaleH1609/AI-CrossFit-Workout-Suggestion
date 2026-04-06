import { describe, it, expect } from 'vitest'
import { getRecentWeeks } from '@/lib/workouts/get-recent-weeks'

function makeSupabase(rows: unknown[] | null) {
  const chain: Record<string, unknown> = {}
  const terminal = { limit: () => Promise.resolve({ data: rows }) }
  const order = { order: () => terminal }
  const is = { is: () => order }
  const eq2 = { eq: () => is, is: () => order }
  const eq1 = { eq: () => eq2 }
  const select = { select: () => eq1 }
  chain.from = () => select
  return chain as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>
}

describe('getRecentWeeks', () => {
  it('returns rows reversed (oldest first)', async () => {
    const rows = [
      { week_start: '2026-03-30', workouts: [] },
      { week_start: '2026-03-23', workouts: [] },
    ]
    const result = await getRecentWeeks(makeSupabase(rows), 'gym-1')
    expect(result[0].week_start).toBe('2026-03-23')
    expect(result[1].week_start).toBe('2026-03-30')
  })

  it('returns empty array when data is null', async () => {
    const result = await getRecentWeeks(makeSupabase(null), 'gym-1')
    expect(result).toEqual([])
  })
})
