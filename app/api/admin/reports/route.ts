// app/api/admin/reports/route.ts
// Analytics data: member trends, attendance heatmap, class utilization, lead conversion
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role, revoked_at').eq('id', user.id).single()
  if (!data || (data.role !== 'admin' && data.role !== 'owner')) return null
  if (data.revoked_at) return null
  return { gymId: data.gym_id as string }
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'overview'
  const gymId = admin.gymId

  if (type === 'overview') {
    // Active members count + 12-month monthly new member trend
    const [{ count: totalMembers }, { data: newPerMonth }, { data: leadStats }, { data: attendanceStats }] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId).eq('role', 'member').is('revoked_at', null),

      // New members per month for last 12 months
      supabase.rpc('members_per_month' as never, { p_gym_id: gymId, p_months: 12 } as never),

      // Lead conversion counts by status
      supabase.from('leads')
        .select('status')
        .eq('gym_id', gymId),

      // Attendance per month (last 12 months)
      supabase.rpc('attendance_per_month' as never, { p_gym_id: gymId, p_months: 12 } as never),
    ])

    // Lead funnel counts
    const leadCounts: Record<string, number> = {}
    for (const row of (leadStats ?? []) as { status: string }[]) {
      leadCounts[row.status] = (leadCounts[row.status] ?? 0) + 1
    }

    return jsonOk({
      totalMembers: totalMembers ?? 0,
      newPerMonth: newPerMonth ?? [],
      attendancePerMonth: attendanceStats ?? [],
      leadFunnel: leadCounts,
    })
  }

  if (type === 'attendance_heatmap') {
    // Bookings by day-of-week + hour for capacity analysis
    const { data, error } = await supabase.rpc('attendance_heatmap' as never, { p_gym_id: gymId } as never)
    if (error) return jsonServerError('reports attendance_heatmap', error)
    return jsonOk(data ?? [])
  }

  if (type === 'class_utilization') {
    // Last 4 weeks: class instances with capacity vs confirmed count
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase.from('class_instances')
      .select(`
        id, starts_at, capacity,
        class_slot_templates(name),
        bookings(count)
      `)
      .eq('gym_id', gymId)
      .gte('starts_at', fourWeeksAgo)
      .order('starts_at', { ascending: false })
      .limit(100)
    if (error) return jsonServerError('reports class_utilization', error)
    return jsonOk(data ?? [])
  }

  if (type === 'feedback_summary') {
    // Average rating per class instance for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('class_feedback')
      .select('instance_id, rating, created_at, class_instances(starts_at, local_time)')
      .eq('gym_id', gymId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
    if (error) return jsonServerError('reports feedback_summary', error)

    // Group by instance_id and compute average + count
    const byInstance: Record<string, { ratings: number[]; startsAt: string; localTime: string }> = {}
    for (const row of (data ?? []) as unknown as {
      instance_id: string; rating: number; class_instances: { starts_at: string; local_time: string }
    }[]) {
      if (!byInstance[row.instance_id]) {
        byInstance[row.instance_id] = {
          ratings: [],
          startsAt: row.class_instances.starts_at,
          localTime: row.class_instances.local_time,
        }
      }
      byInstance[row.instance_id].ratings.push(row.rating)
    }

    const summary = Object.entries(byInstance).map(([instanceId, v]) => ({
      instanceId,
      startsAt: v.startsAt,
      localTime: v.localTime,
      avgRating: v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length,
      count: v.ratings.length,
    })).sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())

    return jsonOk(summary)
  }

  return jsonError('Unknown report type')
}
