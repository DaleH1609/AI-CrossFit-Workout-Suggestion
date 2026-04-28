import { requireOwnerAuth } from '@/lib/auth-helpers'
import { jsonOk, jsonError, jsonServerError, isNextResponse } from '@/lib/api/response'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_RE.test(id)) return jsonError('Invalid program id', 400)

  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { data, error } = await supabase
    .from('specialty_programs')
    .update({ status: 'published' })
    .eq('id', id)
    .eq('gym_id', userData.gym_id)
    .select()
    .single()

  if (error || !data) return jsonServerError('programs/[id]/publish POST', error)
  return jsonOk({ program: data })
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_RE.test(id)) return jsonError('Invalid program id', 400)

  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { data, error } = await supabase
    .from('specialty_programs')
    .update({ status: 'draft' })
    .eq('id', id)
    .eq('gym_id', userData.gym_id)
    .select()
    .single()

  if (error || !data) return jsonServerError('programs/[id]/publish DELETE', error)
  return jsonOk({ program: data })
}
