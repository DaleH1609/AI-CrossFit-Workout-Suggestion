// app/api/admin/leads/route.ts
// GET  — list leads with optional status filter
// PATCH — update lead (status, notes, trial_date)
// DELETE ?id= — delete lead
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { sendLeadTrialBooked } from '@/lib/email/send'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['new', 'contacted', 'trial_booked', 'showed_up', 'joined', 'lost']

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
  const status = searchParams.get('status')

  let query = supabase.from('leads')
    .select('id, email, name, phone, source, status, notes, trial_date, created_at, updated_at')
    .eq('gym_id', admin.gymId)
    .order('created_at', { ascending: false })

  if (status && VALID_STATUSES.includes(status)) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return jsonServerError('admin/leads GET', error)
  return jsonOk(data)
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  let body: { id?: unknown; status?: unknown; notes?: unknown; trial_date?: unknown; name?: unknown; phone?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.id !== 'string') return jsonError('id required')

  const updates: Record<string, unknown> = {}
  const newStatus = typeof body.status === 'string' && VALID_STATUSES.includes(body.status) ? body.status : null
  if (newStatus) updates.status = newStatus
  if (body.notes !== undefined) updates.notes = typeof body.notes === 'string' ? body.notes || null : null
  if (body.trial_date !== undefined) updates.trial_date = typeof body.trial_date === 'string' ? body.trial_date || null : null
  if (typeof body.name === 'string') updates.name = body.name.trim() || null
  if (typeof body.phone === 'string') updates.phone = body.phone.trim() || null

  if (Object.keys(updates).length === 0) return jsonError('Nothing to update')

  const { error } = await supabase.from('leads')
    .update(updates).eq('id', body.id).eq('gym_id', admin.gymId)

  if (error) return jsonServerError('admin/leads PATCH', error)

  // Send trial_booked email when status transitions to trial_booked
  if (newStatus === 'trial_booked') {
    const adb = createAdminClient()
    const [{ data: lead }, { data: gym }] = await Promise.all([
      adb.from('leads').select('email, name, trial_date').eq('id', body.id).single(),
      adb.from('gyms').select('name, contact_email').eq('id', admin.gymId).single(),
    ])
    if (lead && gym) {
      const l = lead as { email: string; name: string | null; trial_date: string | null }
      const g = gym as { name: string; contact_email: string | null }
      const trialDate = (updates.trial_date as string | null | undefined) ?? l.trial_date
      sendLeadTrialBooked(l.email, l.name, g.name, trialDate ?? null, g.contact_email).catch(() => {})
    }
  }

  return jsonOk({ updated: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return jsonError('id required')

  const { error } = await supabase.from('leads').delete().eq('id', id).eq('gym_id', admin.gymId)
  if (error) return jsonServerError('admin/leads DELETE', error)
  return jsonOk({ deleted: true })
}
