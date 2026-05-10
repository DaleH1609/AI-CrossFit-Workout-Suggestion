// app/api/members/skills/route.ts
// GET  — return all skills with member's current level
// PUT  — upsert a skill level for the authenticated member
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase
    .from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return jsonError('User not found', 404)

  const [{ data: allSkills }, { data: myLevels }] = await Promise.all([
    supabase.from('skills').select('id, name, category').order('category').order('name'),
    supabase.from('member_skills')
      .select('skill_id, level, notes')
      .eq('user_id', user.id)
      .eq('gym_id', userData.gym_id),
  ])

  const levelMap = new Map((myLevels ?? []).map(r => [r.skill_id, { level: r.level, notes: r.notes }]))

  const result = (allSkills ?? []).map(s => ({
    ...s,
    level: levelMap.get(s.id)?.level ?? 'none',
    notes: levelMap.get(s.id)?.notes ?? null,
  }))

  return jsonOk(result)
}

export async function PUT(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase
    .from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return jsonError('User not found', 404)

  let body: { skillId?: unknown; level?: unknown; notes?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  const validLevels = ['none', 'learning', 'rx', 'advanced']
  if (typeof body.skillId !== 'string' || typeof body.level !== 'string' || !validLevels.includes(body.level)) {
    return jsonError('skillId and valid level required')
  }

  const { error } = await supabase.from('member_skills').upsert({
    gym_id: userData.gym_id,
    user_id: user.id,
    skill_id: body.skillId,
    level: body.level,
    notes: typeof body.notes === 'string' ? body.notes : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'gym_id,user_id,skill_id' })

  if (error) return jsonServerError('skills PUT', error)
  return jsonOk({ updated: true })
}
