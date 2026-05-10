// app/api/members/onboarding/route.ts
// GET — current member's completed onboarding steps
// POST { step } — mark a self-serve step complete (profile, waiver, first_booking, intro_video)
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

const SELF_SERVE_STEPS = ['profile', 'waiver', 'first_booking', 'intro_video']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data, error } = await supabase.from('member_onboarding')
    .select('step, completed_at, notes')
    .eq('user_id', user.id)
    .order('completed_at')

  if (error) return jsonServerError('onboarding GET', error)
  return jsonOk(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return jsonError('User not found', 404)

  let body: { step?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.step !== 'string' || !SELF_SERVE_STEPS.includes(body.step)) {
    return jsonError(`step must be one of: ${SELF_SERVE_STEPS.join(', ')}`)
  }

  const { error } = await supabase.from('member_onboarding').upsert({
    gym_id: (userData as unknown as { gym_id: string }).gym_id,
    user_id: user.id,
    step: body.step,
  }, { onConflict: 'gym_id,user_id,step', ignoreDuplicates: true })

  if (error) return jsonServerError('onboarding POST', error)
  return jsonOk({ completed: true })
}
