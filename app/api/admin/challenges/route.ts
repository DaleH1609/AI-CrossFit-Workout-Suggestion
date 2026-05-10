export const dynamic = 'force-dynamic'
import { requireOwnerAuth } from '@/lib/auth/require-owner'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

// GET /api/admin/challenges — list challenges for this gym
export async function GET(req: Request) {
  const auth = await requireOwnerAuth()
  if (!auth.ok) return jsonError(auth.error, auth.status)

  try {
    const { data, error } = await createAdminClient()
      .from('monthly_challenges')
      .select('*')
      .eq('gym_id', auth.gymId)
      .order('month', { ascending: false })
    if (error) throw error
    return jsonOk(data ?? [])
  } catch (err) {
    return jsonServerError('Failed to load challenges', err)
  }
}

// POST /api/admin/challenges — create a challenge
export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (!auth.ok) return jsonError(auth.error, auth.status)

  const body = await req.json().catch(() => ({}))
  const { title, description, month, type = 'classes', target } = body as {
    title?: string; description?: string; month?: string; type?: string; target?: number
  }

  if (!title || !month) return jsonError('title and month are required')
  // month must be first of the month
  const monthDate = new Date(month)
  if (isNaN(monthDate.getTime())) return jsonError('Invalid month date')

  try {
    const { data, error } = await createAdminClient()
      .from('monthly_challenges')
      .insert({ gym_id: auth.gymId, title, description, month, type, target, active: true })
      .select()
      .single()
    if (error) throw error
    return jsonOk(data)
  } catch (err) {
    return jsonServerError('Failed to create challenge', err)
  }
}

// PATCH /api/admin/challenges — update (active toggle, title, etc.)
export async function PATCH(req: Request) {
  const auth = await requireOwnerAuth()
  if (!auth.ok) return jsonError(auth.error, auth.status)

  const body = await req.json().catch(() => ({}))
  const { id, ...updates } = body as { id?: string; [k: string]: unknown }
  if (!id) return jsonError('id is required')

  try {
    const { error } = await createAdminClient()
      .from('monthly_challenges')
      .update(updates)
      .eq('id', id)
      .eq('gym_id', auth.gymId)
    if (error) throw error
    return jsonOk({ ok: true })
  } catch (err) {
    return jsonServerError('Failed to update challenge', err)
  }
}

// DELETE /api/admin/challenges?id=...
export async function DELETE(req: Request) {
  const auth = await requireOwnerAuth()
  if (!auth.ok) return jsonError(auth.error, auth.status)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return jsonError('id is required')

  try {
    const { error } = await createAdminClient()
      .from('monthly_challenges')
      .delete()
      .eq('id', id)
      .eq('gym_id', auth.gymId)
    if (error) throw error
    return jsonOk({ ok: true })
  } catch (err) {
    return jsonServerError('Failed to delete challenge', err)
  }
}
