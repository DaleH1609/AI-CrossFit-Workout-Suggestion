// app/api/members/stats/route.ts
// Returns attendance stats for the authenticated member
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

function calcStreaks(dates: string[]): { current: number; longest: number; total: number } {
  if (dates.length === 0) return { current: 0, longest: 0, total: 0 }

  // Deduplicate dates (multiple classes on same day count as one streak day)
  const unique = [...new Set(dates)].sort()
  const total = dates.length

  let longest = 1
  let current = 1
  let streak = 1

  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1] + 'T12:00:00Z')
    const curr = new Date(unique[i] + 'T12:00:00Z')
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      streak++
    } else {
      streak = 1
    }
    if (streak > longest) longest = streak
  }

  // Current streak: work backwards from today
  const today = new Date()
  today.setUTCHours(12, 0, 0, 0)
  current = 0
  for (let i = unique.length - 1; i >= 0; i--) {
    const d = new Date(unique[i] + 'T12:00:00Z')
    const diffDays = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === current) {
      current++
    } else if (diffDays === current + 1 && current === 0) {
      // Allow yesterday to still count as current (if they haven't trained today yet)
      current++
    } else {
      break
    }
  }

  return { current, longest, total }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: attended } = await supabase
    .from('bookings')
    .select('class_instances(date)')
    .eq('user_id', user.id)
    .eq('attended', true)

  const dates: string[] = (attended ?? [])
    .map((b: unknown) => {
      const row = b as { class_instances: { date: string } | null }
      return row.class_instances?.date
    })
    .filter((d): d is string => typeof d === 'string')

  const { data: userRow } = await supabase
    .from('users')
    .select('created_at')
    .eq('id', user.id)
    .single()

  const joinedAt = (userRow as unknown as { created_at: string } | null)?.created_at ?? null

  return jsonOk({ ...calcStreaks(dates), joinedAt })
}
