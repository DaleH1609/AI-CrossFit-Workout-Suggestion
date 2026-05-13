export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

// GET /api/coach/classes — upcoming classes for the authenticated coach (next 14 days)
export async function GET() {
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabaseUser.from('users').select('gym_id, role, revoked_at').eq('id', user.id).single()
  const u = userData as { gym_id: string; role: string; revoked_at: string | null } | null
  if (!u || !['owner', 'admin', 'coach'].includes(u.role ?? '')) return jsonError('Forbidden', 403)
  if (u.revoked_at) return jsonError('Forbidden', 403)

  try {
    const supabase = createAdminClient()
    const now = new Date().toISOString()
    const twoWeeksOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    let query = supabase
      .from('class_instances')
      .select(`
        id, starts_at, capacity,
        class_slot_templates(name),
        bookings(id, status, attended, users(name, email))
      `)
      .eq('gym_id', u.gym_id)
      .gte('starts_at', now)
      .lte('starts_at', twoWeeksOut)
      .order('starts_at')

    // Coaches only see their assigned classes; owners/admins see all
    if (u.role === 'coach') {
      query = query.eq('coach_id', user.id)
    }

    const { data, error } = await query
    if (error) throw error
    return jsonOk(data ?? [])
  } catch (err) {
    return jsonServerError('Failed to load coach classes', err)
  }
}
