// app/api/admin/reports/route.ts
// Analytics data: member trends, attendance heatmap, class utilization, lead conversion
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (!data || (data.role !== 'admin' && data.role !== 'owner')) return null
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

  return jsonError('Unknown report type')
}
