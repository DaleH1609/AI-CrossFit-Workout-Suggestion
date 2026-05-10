// app/api/leads/route.ts
// Public POST — capture a lead from any website form (no auth required)
// Requires ?gymId= query param so the form knows which gym to attribute the lead to.
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const gymId = searchParams.get('gymId')
  if (!gymId) return jsonError('gymId required')

  let body: { email?: unknown; name?: unknown; phone?: unknown; source?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.email !== 'string' || !body.email.includes('@')) {
    return jsonError('Valid email required')
  }

  const supabase = await createClient()

  // Verify gym exists and is active
  const { data: gym } = await supabase.from('gyms').select('id').eq('id', gymId).single()
  if (!gym) return jsonError('Gym not found', 404)

  const { error } = await supabase.from('leads').upsert({
    gym_id: gymId,
    email: body.email.toLowerCase().trim(),
    name: typeof body.name === 'string' ? body.name.trim() || null : null,
    phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
    source: typeof body.source === 'string' ? body.source.trim() || 'website' : 'website',
    status: 'new',
  }, { onConflict: 'gym_id,email', ignoreDuplicates: true })

  if (error) return jsonServerError('leads POST', error)
  return jsonOk({ captured: true })
}
