// app/(admin)/gyms/[gymId]/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { requireAdminAuth } from '@/lib/auth-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export async function suspendGym(gymId: string, gymName: string) {
  const { user } = await requireAdminAuth()
  const db = createAdminClient()

  const { error } = await db
    .from('gyms')
    .update({ suspended_at: new Date().toISOString() })
    .eq('id', gymId)

  if (error) throw new Error('Failed to suspend gym')

  const { error: auditError } = await db.from('admin_audit_log').insert({
    admin_email: user.email,
    action: 'suspend_gym',
    target_id: gymId,
    target_name: gymName,
  })
  if (auditError) console.error('[admin] audit log insert failed (suspend_gym)', auditError)

  redirect(`/admin/gyms/${gymId}`)
}

export async function unsuspendGym(gymId: string, gymName: string) {
  const { user } = await requireAdminAuth()
  const db = createAdminClient()

  const { error } = await db
    .from('gyms')
    .update({ suspended_at: null })
    .eq('id', gymId)

  if (error) throw new Error('Failed to unsuspend gym')

  const { error: auditError } = await db.from('admin_audit_log').insert({
    admin_email: user.email,
    action: 'unsuspend_gym',
    target_id: gymId,
    target_name: gymName,
  })
  if (auditError) console.error('[admin] audit log insert failed (unsuspend_gym)', auditError)

  redirect(`/admin/gyms/${gymId}`)
}

export async function deleteGym(gymId: string, gymName: string) {
  const { user } = await requireAdminAuth()
  const db = createAdminClient()

  // Server-side confirmation: verify gymName matches the actual DB record
  const { data: gym, error: fetchError } = await db
    .from('gyms')
    .select('name')
    .eq('id', gymId)
    .single()

  if (fetchError || !gym) throw new Error('Gym not found')
  if ((gym as { name: string }).name !== gymName) throw new Error('Gym name does not match')

  const { error } = await db
    .from('gyms')
    .delete()
    .eq('id', gymId)

  if (error) throw new Error('Failed to delete gym')

  const { error: auditError } = await db.from('admin_audit_log').insert({
    admin_email: user.email,
    action: 'delete_gym',
    target_id: gymId,
    target_name: gymName,
  })
  if (auditError) console.error('[admin] audit log insert failed (delete_gym)', auditError)

  redirect('/admin/gyms')
}
