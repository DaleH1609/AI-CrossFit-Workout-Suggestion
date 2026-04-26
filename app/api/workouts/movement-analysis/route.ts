// app/api/workouts/movement-analysis/route.ts
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { getRecentWeeks } from '@/lib/workouts/get-recent-weeks'
import { analyseMovementHistory } from '@/lib/claude/generate-workouts'
import { jsonOk, jsonError } from '@/lib/api/response'
import { rateLimit } from '@/lib/rate-limit'

export async function GET() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { limited } = await rateLimit(userData.gym_id, 'ai')
  if (limited) return jsonError('Too many requests. Please wait before generating again.', 429)

  const recentWeeks = await getRecentWeeks(supabase, userData.gym_id)

  if (recentWeeks.length < 2) {
    return jsonOk({ insufficient_data: true })
  }

  const analysis = await analyseMovementHistory(recentWeeks)
  if (!analysis) {
    return jsonError('Movement analysis unavailable', 503)
  }

  return jsonOk(analysis)
}
