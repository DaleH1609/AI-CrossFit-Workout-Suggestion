// app/api/members/request-deletion/route.ts
// POST — member self-requests deletion of their own account (GDPR Art. 17 right to erasure).
// Records the request; an owner must confirm via the dashboard before data is erased.
// The gym's contact_email receives an alert so they can action it within 30 days.
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { sendDeletionRequestAlert } from '@/lib/email/send'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase
    .from('users')
    .select('id, name, email, gym_id')
    .eq('id', user.id)
    .single()
  if (!userData) return jsonError('User not found', 404)
  const u = userData as { id: string; name: string | null; email: string; gym_id: string }

  const adb = createAdminClient()

  // Check if there is already a pending request to avoid duplicates
  const { data: existing } = await adb
    .from('deletion_requests')
    .select('id')
    .eq('user_id', u.id)
    .eq('status', 'pending')
    .maybeSingle()
  if (existing) return jsonOk({ requested: true, existing: true })

  // Insert the deletion request
  const { error } = await adb.from('deletion_requests').insert({
    user_id: u.id,
    gym_id: u.gym_id,
    requested_at: new Date().toISOString(),
    status: 'pending',
  })
  if (error) return jsonServerError('members/request-deletion POST', error)

  // Notify the gym owner (fire-and-forget — non-critical)
  const { data: gym } = await adb
    .from('gyms')
    .select('contact_email, name')
    .eq('id', u.gym_id)
    .single()
  const g = gym as { contact_email: string | null; name: string } | null
  if (g?.contact_email) {
    sendDeletionRequestAlert(g.contact_email, u.name, u.email, g.name).catch(() => {})
  }

  return jsonOk({ requested: true })
}
