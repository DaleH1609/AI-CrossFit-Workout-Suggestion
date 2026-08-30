import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonServerError } from '@/lib/api/response'

/**
 * Member directory for the command palette.
 *
 * app/api/members/ had eighteen sub-routes but no index, so there was no way
 * to list members for search. Deliberately minimal: id, name and email only.
 * The palette needs enough to match on and nothing more, and a directory
 * endpoint should not become a general member dump.
 *
 * Owner-scoped, so it can only ever return members of the caller's own gym.
 */
export async function GET() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('gym_id', userData.gym_id)
    .is('revoked_at', null)
    .order('name', { nullsFirst: false })
    .limit(500)

  if (error) return jsonServerError('members GET', error)

  return jsonOk({ members: data ?? [] })
}
