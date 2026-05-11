// app/api/profile/email/route.ts
// POST — called after a member confirms an email change in their inbox.
//        Supabase updates auth.users.email automatically on confirmation;
//        this route syncs the change to public.users.email via service-role
//        so the two tables stay in sync (N9-safe: only the authenticated
//        user can trigger a sync of their own email, and only to match
//        what auth.users already holds).
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return jsonError('Unauthorized', 401)

  // Use admin client to bypass the RLS lock on users.email
  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({ email: user.email })
    .eq('id', user.id)

  if (error) return jsonServerError('profile/email sync', error)
  return jsonOk({ email: user.email })
}
