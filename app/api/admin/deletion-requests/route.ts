// app/api/admin/deletion-requests/route.ts
// GET  — list pending deletion requests for this gym
// PATCH — mark a request as actioned (after owner manually deletes the member)
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

export async function GET() {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { data, error } = await supabase
    .from('deletion_requests')
    .select('id, status, requested_at, actioned_at, users(id, name, email)')
    .eq('gym_id', admin.gymId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  if (error) return jsonServerError('admin/deletion-requests GET', error)
  return jsonOk(data ?? [])
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  let body: { id?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }
  if (typeof body.id !== 'string') return jsonError('id required')

  const { error } = await supabase
    .from('deletion_requests')
    .update({ status: 'actioned', actioned_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('gym_id', admin.gymId)

  if (error) return jsonServerError('admin/deletion-requests PATCH', error)
  return jsonOk({ actioned: true })
}
