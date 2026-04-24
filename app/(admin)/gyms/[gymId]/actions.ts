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

  if (error) throw new Error(`Failed to suspend gym: ${error.message}`)

  await db.from('admin_audit_log').insert({
    admin_email: user.email,
    action: 'suspend_gym',
    target_id: gymId,
    target_name: gymName,
  })

  redirect(`/admin/gyms/${gymId}`)
}

export async function unsuspendGym(gymId: string, gymName: string) {
  const { user } = await requireAdminAuth()
  const db = createAdminClient()

  const { error } = await db
    .from('gyms')
    .update({ suspended_at: null })
    .eq('id', gymId)

  if (error) throw new Error(`Failed to unsuspend gym: ${error.message}`)

  await db.from('admin_audit_log').insert({
    admin_email: user.email,
    action: 'unsuspend_gym',
    target_id: gymId,
    target_name: gymName,
  })

  redirect(`/admin/gyms/${gymId}`)
}

export async function deleteGym(gymId: string, gymName: string) {
  const { user } = await requireAdminAuth()
  const db = createAdminClient()

  const { error } = await db
    .from('gyms')
    .delete()
    .eq('id', gymId)

  if (error) throw new Error(`Failed to delete gym: ${error.message}`)

  // Audit log written after delete succeeds, before redirect
  await db.from('admin_audit_log').insert({
    admin_email: user.email,
    action: 'delete_gym',
    target_id: gymId,
    target_name: gymName,
  })

  redirect('/admin/gyms')
}
