// app/api/workouts/movement-analysis/route.ts
// app/api/workouts/movement-analysis/route.ts
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { getRecentWeeks } from '@/lib/workouts/get-recent-weeks'
import { analyseMovementHistory } from '@/lib/claude/generate-workouts'
import { jsonOk, jsonError } from '@/lib/api/response'
import { rateLimit } from '@/lib/rate-limit'
import { checkAiLimit, incrementAiCalls } from '@/lib/ai/spend-limit'

export async function GET() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth
  const gymId = userData.gym_id

  const { limited } = await rateLimit(gymId, 'ai')
  if (limited) return jsonError('Too many requests. Please wait before generating again.', 429)

  const { limited: atLimit } = await checkAiLimit(gymId, supabase)
  if (atLimit) return jsonError('Monthly AI generation limit reached. Resets at the start of next month.', 429)

  const recentWeeks = await getRecentWeeks(supabase, gymId)

  if (recentWeeks.length < 2) {
    return jsonOk({ insufficient_data: true })
  }

  const { analysis, usage } = await analyseMovementHistory(recentWeeks)
  if (!analysis) {
    return jsonError('Movement analysis unavailable', 503)
  }

  incrementAiCalls(gymId, supabase, { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens })
    .catch(err => console.error('[movement-analysis] incrementAiCalls failed', err))
  return jsonOk(analysis)
}
