// app/api/members/badges/route.ts
// GET — return all badges with earned status for the current member
// POST — check and award any newly earned badges (called after class attendance)
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

const ATTENDANCE_THRESHOLDS = [1, 10, 25, 50, 100, 250]
const SLUG_BY_THRESHOLD: Record<number, string> = {
  1: 'first-class', 10: '10-classes', 25: '25-classes',
  50: '50-classes', 100: '100-classes', 250: '250-classes',
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return jsonError('User not found', 404)

  const [{ data: allBadges }, { data: earned }] = await Promise.all([
    supabase.from('badge_definitions').select('id, slug, name, description, icon'),
    supabase.from('member_badges')
      .select('badge_id, earned_at')
      .eq('user_id', user.id)
      .eq('gym_id', (userData as unknown as { gym_id: string }).gym_id),
  ])

  const earnedMap = new Map((earned ?? []).map(e => [e.badge_id, e.earned_at]))
  const result = (allBadges ?? []).map(b => ({
    ...b,
    earned: earnedMap.has(b.id),
    earned_at: earnedMap.get(b.id) ?? null,
  }))

  return jsonOk(result)
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return jsonError('User not found', 404)
  const gymId = (userData as unknown as { gym_id: string }).gym_id

  // Count attended classes
  const { count } = await supabase.from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('attended', true)

  const total = count ?? 0

  // Find which attendance-based badges are newly earned
  const toAward = ATTENDANCE_THRESHOLDS.filter(t => total >= t).map(t => SLUG_BY_THRESHOLD[t])

  if (toAward.length === 0) return jsonOk({ awarded: [] })

  // Get badge IDs for those slugs
  const { data: defs } = await supabase.from('badge_definitions')
    .select('id, slug').in('slug', toAward)

  // Get already-earned badges
  const { data: alreadyEarned } = await supabase.from('member_badges')
    .select('badge_id').eq('user_id', user.id).eq('gym_id', gymId)

  const alreadySet = new Set((alreadyEarned ?? []).map(e => e.badge_id))
  const newBadges = (defs ?? []).filter(d => !alreadySet.has(d.id))

  if (newBadges.length === 0) return jsonOk({ awarded: [] })

  const { error } = await supabase.from('member_badges').insert(
    newBadges.map(b => ({ gym_id: gymId, user_id: user.id, badge_id: b.id }))
  )

  if (error) return jsonServerError('badges POST', error)
  return jsonOk({ awarded: newBadges.map(b => b.slug) })
}
