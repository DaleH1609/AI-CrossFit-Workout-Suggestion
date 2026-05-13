// app/api/admin/audit-log/route.ts
// GET — paginated gym audit log for owner dashboard
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
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200)

  // Use the user-scoped client — the RLS policy on gym_audit_log already
  // restricts reads to owner/admin of the caller's gym, so no admin client needed.
  const { data, error } = await supabase
    .from('gym_audit_log')
    .select('id, action, target_type, target_id, payload, created_at, users(name, email)')
    .eq('gym_id', admin.gymId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return jsonServerError('admin/audit-log GET', error)
  return jsonOk(data ?? [])
}
