// app/api/members/waiver/route.ts
// POST: record waiver acceptance for the authenticated member
// PATCH: update photo consent
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { error } = await supabase.from('users')
    .update({ waiver_signed_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return jsonServerError('waiver POST', error)
  return jsonOk({ signed: true })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  let body: { photo_consent?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  if (typeof body.photo_consent !== 'boolean') return jsonError('photo_consent must be boolean')

  const { error } = await supabase.from('users')
    .update({ photo_consent: body.photo_consent })
    .eq('id', user.id)

  if (error) return jsonServerError('waiver PATCH', error)
  return jsonOk({ photo_consent: body.photo_consent })
}
