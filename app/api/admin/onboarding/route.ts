// app/api/admin/onboarding/route.ts
// GET ?memberId= — member's onboarding progress
// POST { memberId, step } — mark intro_class_N complete (coach/admin action)
// DELETE ?memberId=&step= — unmark a step
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

const INTRO_STEPS = ['intro_class_1', 'intro_class_2', 'intro_class_3', 'intro_class_4', 'intro_class_5', 'intro_class_6']

async function requireAdminOrCoach(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (!data || !(['admin', 'owner', 'coach'].includes(data.role))) return null
  return { gymId: data.gym_id as string, actorId: user.id }
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const actor = await requireAdminOrCoach(supabase)
  if (!actor) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  if (!memberId) return jsonError('memberId required')

  const { data, error } = await supabase.from('member_onboarding')
    .select('step, completed_at, notes')
    .eq('user_id', memberId)
    .eq('gym_id', actor.gymId)
    .order('completed_at')

  if (error) return jsonServerError('admin/onboarding GET', error)
  return jsonOk(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const actor = await requireAdminOrCoach(supabase)
  if (!actor) return jsonError('Unauthorized', 401)

  let body: { memberId?: unknown; step?: unknown; notes?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.memberId !== 'string') return jsonError('memberId required')
  if (typeof body.step !== 'string' || !INTRO_STEPS.includes(body.step)) {
    return jsonError(`step must be one of: ${INTRO_STEPS.join(', ')}`)
  }

  // Verify member belongs to actor's gym
  const { data: member } = await supabase.from('users').select('id').eq('id', body.memberId).eq('gym_id', actor.gymId).single()
  if (!member) return jsonError('Member not found', 404)

  const { error } = await createAdminClient().from('member_onboarding').upsert({
    gym_id: actor.gymId,
    user_id: body.memberId,
    step: body.step,
    notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
  }, { onConflict: 'gym_id,user_id,step', ignoreDuplicates: false })

  if (error) return jsonServerError('admin/onboarding POST', error)
  return jsonOk({ marked: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const actor = await requireAdminOrCoach(supabase)
  if (!actor) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  const step = searchParams.get('step')
  if (!memberId || !step) return jsonError('memberId and step required')

  const { error } = await createAdminClient().from('member_onboarding')
    .delete().eq('gym_id', actor.gymId).eq('user_id', memberId).eq('step', step)

  if (error) return jsonServerError('admin/onboarding DELETE', error)
  return jsonOk({ removed: true })
}
