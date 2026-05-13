export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

// GET /api/members/challenges — active challenges + opt-in state + leaderboard
export async function GET(req: Request) {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth

  const userId = auth.user.id
  const gymId = (auth.userData as unknown as { gym_id: string }).gym_id

  const { searchParams } = new URL(req.url)
  const challengeId = searchParams.get('id')

  // Admin client needed for leaderboard (cross-user reads bypass member RLS)
  const adb = createAdminClient()

  try {
    if (challengeId) {
      // Leaderboard for a specific challenge
      const monthStart = searchParams.get('month') // e.g. 2026-02-01
      const monthEnd = monthStart
        ? new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 1)
            .toISOString().split('T')[0]
        : null

      const [{ data: entries }, { data: bookings }] = await Promise.all([
        adb.from('challenge_entries')
          .select('user_id, opted_in_at, users(name)')
          .eq('challenge_id', challengeId),
        monthStart && monthEnd
          ? adb.from('bookings')
              .select('user_id')
              .eq('gym_id', gymId)
              .in('status', ['confirmed', 'attended'])
              .gte('created_at', monthStart)
              .lt('created_at', monthEnd)
          : Promise.resolve({ data: [] }),
      ])

      // Count bookings per opted-in user
      const optedInIds = new Set((entries ?? []).map((e: { user_id: string }) => e.user_id))
      const counts: Record<string, number> = {}
      for (const b of (bookings ?? []) as { user_id: string }[]) {
        if (optedInIds.has(b.user_id)) {
          counts[b.user_id] = (counts[b.user_id] ?? 0) + 1
        }
      }

      const leaderboard = (entries ?? [])
        .map((e: { user_id: string; opted_in_at: string; users: { name: string } | null }) => ({
          userId: e.user_id,
          name: e.users?.name ?? 'Anonymous',
          score: counts[e.user_id] ?? 0,
          isMe: e.user_id === userId,
        }))
        .sort((a: { score: number }, b: { score: number }) => b.score - a.score)

      return jsonOk({ leaderboard })
    }

    // List active challenges + my opt-in state
    const [{ data: challenges }, { data: myEntries }] = await Promise.all([
      adb.from('monthly_challenges')
        .select('*')
        .eq('gym_id', gymId)
        .eq('active', true)
        .order('month', { ascending: false }),
      adb.from('challenge_entries')
        .select('challenge_id')
        .eq('user_id', userId),
    ])

    const enteredIds = new Set((myEntries ?? []).map((e: { challenge_id: string }) => e.challenge_id))

    return jsonOk({
      challenges: (challenges ?? []).map((c: Record<string, unknown>) => ({
        ...c,
        isOptedIn: enteredIds.has(c.id as string),
      })),
    })
  } catch (err) {
    return jsonServerError('Failed to load challenges', err)
  }
}

// POST /api/members/challenges — opt in or out of a challenge
export async function POST(req: Request) {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth

  const userId = auth.user.id
  const gymId = (auth.userData as unknown as { gym_id: string }).gym_id

  const body = await req.json().catch(() => ({}))
  const { challengeId, optIn } = body as { challengeId?: string; optIn?: boolean }
  if (!challengeId) return jsonError('challengeId is required')

  // User-scoped client: RLS "members manage own entries" covers insert/delete
  const { supabase } = auth

  try {
    if (optIn) {
      const { error } = await supabase
        .from('challenge_entries')
        .upsert({ challenge_id: challengeId, user_id: userId, gym_id: gymId }, { ignoreDuplicates: true })
      if (error) return jsonServerError('challenges opt-in', error)
    } else {
      const { error } = await supabase
        .from('challenge_entries')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
      if (error) return jsonServerError('challenges opt-out', error)
    }
    return jsonOk({ ok: true })
  } catch (err) {
    return jsonServerError('Failed to update opt-in', err)
  }
}
