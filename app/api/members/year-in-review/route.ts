export const dynamic = 'force-dynamic'
import { requireMemberAuth } from '@/lib/auth/require-member'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

// GET /api/members/year-in-review?year=2026
export async function GET(req: Request) {
  const auth = await requireMemberAuth()
  if (!auth.ok) return jsonError(auth.error, auth.status)

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10)
  const yearStart = `${year}-01-01`
  const yearEnd = `${year + 1}-01-01`

  try {
    const supabase = createAdminClient()

    const [{ data: bookings }, { data: userData }] = await Promise.all([
      supabase
        .from('bookings')
        .select('created_at, instance_id, class_instances(date, local_time)')
        .eq('user_id', auth.userId)
        .eq('gym_id', auth.gymId)
        .in('status', ['confirmed', 'attended'])
        .gte('created_at', yearStart)
        .lt('created_at', yearEnd),
      supabase
        .from('users')
        .select('created_at')
        .eq('id', auth.userId)
        .single(),
    ])

    const rows = (bookings ?? []) as {
      created_at: string
      class_instances: { date: string; local_time: string } | null
    }[]

    // Total classes
    const totalClasses = rows.length

    // Favourite day of week
    const dayCount: Record<string, number> = {}
    const timeCount: Record<string, number> = {}
    for (const b of rows) {
      if (!b.class_instances) continue
      const d = new Date(b.class_instances.date + 'T12:00:00Z')
      const day = d.toLocaleDateString('en-GB', { weekday: 'long' })
      dayCount[day] = (dayCount[day] ?? 0) + 1
      // Bucket times into hour slots
      const [h] = (b.class_instances.local_time ?? '').split(':')
      const hour = parseInt(h, 10)
      if (!isNaN(hour)) {
        const label = `${hour}:00`
        timeCount[label] = (timeCount[label] ?? 0) + 1
      }
    }
    const favouriteDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const favouriteTime = Object.entries(timeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    // Longest streak (consecutive attended days, not necessarily consecutive calendar weeks)
    const attendedDates = [...new Set(rows.map(b => b.class_instances?.date).filter(Boolean))] as string[]
    attendedDates.sort()
    let longestStreak = 0
    let currentStreak = 0
    let prevDate: Date | null = null
    for (const dateStr of attendedDates) {
      const d = new Date(dateStr)
      if (prevDate) {
        const diff = (d.getTime() - prevDate.getTime()) / 86_400_000
        if (diff === 1) {
          currentStreak++
        } else {
          longestStreak = Math.max(longestStreak, currentStreak)
          currentStreak = 1
        }
      } else {
        currentStreak = 1
      }
      prevDate = d
    }
    longestStreak = Math.max(longestStreak, currentStreak)

    // Monthly breakdown
    const monthly: Record<string, number> = {}
    for (const b of rows) {
      if (!b.class_instances?.date) continue
      const mo = b.class_instances.date.slice(0, 7) // "2026-03"
      monthly[mo] = (monthly[mo] ?? 0) + 1
    }
    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
      const mo = `${year}-${String(i + 1).padStart(2, '0')}`
      return { month: mo, count: monthly[mo] ?? 0 }
    })

    // Best month
    const bestMonth = monthlyBreakdown.reduce((best, cur) => cur.count > best.count ? cur : best, { month: '', count: 0 })

    const memberSince = (userData as unknown as { created_at: string } | null)?.created_at ?? null

    return jsonOk({
      year,
      totalClasses,
      favouriteDay,
      favouriteTime,
      longestStreak,
      bestMonth: bestMonth.count > 0 ? bestMonth : null,
      monthlyBreakdown,
      memberSince,
    })
  } catch (err) {
    return jsonServerError('Failed to load year in review', err)
  }
}
