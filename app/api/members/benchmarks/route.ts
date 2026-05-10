// GET — all benchmarks with member's best result
// POST — add a benchmark result
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return jsonError('User not found', 404)

  const [{ data: allBenchmarks }, { data: myResults }] = await Promise.all([
    supabase.from('benchmarks').select('id, name, category, unit').order('category').order('name'),
    supabase.from('benchmark_results')
      .select('benchmark_id, score_value, rx, recorded_on')
      .eq('user_id', user.id)
      .eq('gym_id', (userData as unknown as { gym_id: string }).gym_id)
      .order('recorded_on', { ascending: false }),
  ])

  // Keep only the most recent result per benchmark
  const bestMap = new Map<string, { score_value: string; rx: boolean; recorded_on: string }>()
  for (const r of (myResults ?? [])) {
    if (!bestMap.has(r.benchmark_id)) bestMap.set(r.benchmark_id, r)
  }

  const result = (allBenchmarks ?? []).map(b => ({
    ...b,
    best: bestMap.get(b.id) ?? null,
  }))

  return jsonOk(result)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return jsonError('User not found', 404)

  let body: { benchmarkId?: unknown; scoreValue?: unknown; rx?: unknown; notes?: unknown; recordedOn?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.benchmarkId !== 'string') return jsonError('benchmarkId required')
  if (typeof body.scoreValue !== 'string' || !body.scoreValue.trim()) return jsonError('scoreValue required')

  const { error } = await supabase.from('benchmark_results').insert({
    gym_id: (userData as unknown as { gym_id: string }).gym_id,
    user_id: user.id,
    benchmark_id: body.benchmarkId,
    score_value: body.scoreValue.trim(),
    rx: body.rx !== false,
    notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
    recorded_on: typeof body.recordedOn === 'string' && body.recordedOn ? body.recordedOn : undefined,
  })

  if (error) return jsonServerError('benchmarks POST', error)
  return jsonOk({ recorded: true })
}
