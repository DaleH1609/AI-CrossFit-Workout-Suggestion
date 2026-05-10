// app/api/admin/audit-log/route.ts
// GET — paginated gym audit log for owner dashboard
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
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200)

  // Uses service-role via createAdminClient so RLS doesn't block reads
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adb = createAdminClient()

  const { data, error } = await adb
    .from('gym_audit_log')
    .select('id, action, target_type, target_id, payload, created_at, users(name, email)')
    .eq('gym_id', admin.gymId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return jsonServerError('admin/audit-log GET', error)
  return jsonOk(data ?? [])
}
