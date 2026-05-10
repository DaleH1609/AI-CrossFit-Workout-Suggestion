// app/api/members/measurements/route.ts
// GET — member's measurement history
// POST — log a new measurement
// DELETE ?id= — delete a measurement entry
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return jsonError('User not found', 404)

  const { data, error } = await supabase.from('measurements')
    .select('id, measured_at, weight_kg, body_fat_pct, muscle_mass_kg, chest_cm, waist_cm, hips_cm, notes')
    .eq('user_id', user.id)
    .order('measured_at', { ascending: false })
    .limit(100)

  if (error) return jsonServerError('measurements GET', error)
  return jsonOk(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return jsonError('User not found', 404)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  const num = (v: unknown) => typeof v === 'number' && isFinite(v) ? v : null

  const { data, error } = await supabase.from('measurements').insert({
    gym_id: (userData as unknown as { gym_id: string }).gym_id,
    user_id: user.id,
    measured_at: typeof body.measured_at === 'string' ? body.measured_at : new Date().toISOString().slice(0, 10),
    weight_kg:      num(body.weight_kg),
    body_fat_pct:   num(body.body_fat_pct),
    muscle_mass_kg: num(body.muscle_mass_kg),
    chest_cm:       num(body.chest_cm),
    waist_cm:       num(body.waist_cm),
    hips_cm:        num(body.hips_cm),
    notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
  }).select().single()

  if (error) return jsonServerError('measurements POST', error)
  return jsonOk(data)
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return jsonError('id required')

  const { error } = await supabase.from('measurements').delete().eq('id', id).eq('user_id', user.id)
  if (error) return jsonServerError('measurements DELETE', error)
  return jsonOk({ deleted: true })
}
