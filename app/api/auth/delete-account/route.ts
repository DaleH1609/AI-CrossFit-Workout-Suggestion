// app/api/auth/delete-account/route.ts
//
// Permanently deletes the owner's gym and all associated data.
// Cascade on the gyms table handles: users, bookings, class_instances,
// class_slot_templates, workout_weeks, style_examples.
// We additionally delete all Supabase Auth accounts (members + owner)
// since those live outside the DB schema.

import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonServerError } from '@/lib/api/response'

export async function DELETE(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, user, userData } = auth
  const gymId = userData.gym_id
  const admin = createAdminClient()

  // Collect all auth user IDs in this gym before deleting the DB rows
  const { data: members } = await supabase
    .from('users')
    .select('id')
    .eq('gym_id', gymId)

  const userIds = (members ?? []).map((m: { id: string }) => m.id)

  // Delete the gym — cascades to all app data
  const { error: gymDeleteError } = await admin.from('gyms').delete().eq('id', gymId)
  if (gymDeleteError) return jsonServerError('delete-account gyms.delete', gymDeleteError)

  // Delete all Supabase Auth accounts (non-blocking failures logged only)
  await Promise.all(
    userIds.map(async (id) => {
      if (id === user.id) return // delete owner last
      try { await admin.auth.admin.deleteUser(id) } catch (err) {
        console.error('[delete-account] failed to delete member auth', id, err)
      }
    })
  )

  // Delete the owner's auth account last
  try { await admin.auth.admin.deleteUser(user.id) } catch (err) {
    console.error('[delete-account] failed to delete owner auth', user.id, err)
  }

  return jsonOk({ success: true })
}
