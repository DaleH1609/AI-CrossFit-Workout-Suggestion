import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/admin'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { userData } = auth
  const body = await req.json().catch(() => null)
  const rawEmail = body?.email

  if (typeof rawEmail !== 'string' || !EMAIL_RE.test(rawEmail.trim())) {
    return jsonError('A valid email address is required')
  }

  // Normalize to lowercase so 'John@x.com' and 'john@x.com' are the same member.
  // Supabase Auth treats emails case-insensitively internally; our `users` table
  // has a case-sensitive unique(gym_id, email) index — so normalizing at the
  // app boundary prevents the "two accounts, one inbox" duplicate.
  const email = rawEmail.trim().toLowerCase()

  const adminSupabase = createAdminClient()

  // Guard: if this email is already a member of a DIFFERENT gym, an upsert on
  // id would silently overwrite their gym_id, moving them between gyms. Refuse.
  // limit(1) prevents a 500 if the same email somehow appears in two rows
  // (unique constraint is per gym_id, not global) — maybeSingle() would throw
  // on multiple rows without the limit.
  const { data: existingByEmail } = await adminSupabase
    .from('users')
    .select('id, gym_id, revoked_at')
    .eq('email', email)
    .limit(1)
    .maybeSingle()

  if (existingByEmail && existingByEmail.gym_id !== userData.gym_id) {
    // Don't reveal that this email exists at another gym — that leaks cross-gym membership.
    return jsonError('Unable to send invite. Please try again.')
  }

  // Supabase sends its own invite email with the magic link.
  const { data: inviteData, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL?.trim()}/invite`,
  })
  // Don't leak Supabase error details (could reveal whether an email already exists).
  if (error) return jsonError('Unable to send invite. Please try again.')

  // Create user row (upsert in case they were previously deleted from users but
  // Auth account persists). Re-assert gym_id here so a rejoin clears any prior
  // revocation and keeps the member on this gym.
  const { error: insertError } = await adminSupabase.from('users').upsert(
    { id: inviteData.user.id, gym_id: userData.gym_id, email, role: 'member' },
    { onConflict: 'id' }
  )

  if (insertError) return jsonServerError('members/invite users.upsert', insertError)

  return jsonOk({ success: true })
}
