// app/(admin)/gyms/[gymId]/actions.ts
// Server Actions for gym danger zone operations.
// Full implementation: Task 12.
'use server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export async function suspendGym(gymId: string, gymName: string): Promise<void> {
  const db = createAdminClient()
  await db.from('gyms').update({ suspended_at: new Date().toISOString() }).eq('id', gymId)
  redirect('/admin/gyms')
}

export async function unsuspendGym(gymId: string, gymName: string): Promise<void> {
  const db = createAdminClient()
  await db.from('gyms').update({ suspended_at: null }).eq('id', gymId)
  redirect(`/admin/gyms/${gymId}`)
}

export async function deleteGym(gymId: string, gymName: string): Promise<void> {
  const db = createAdminClient()
  await db.from('gyms').delete().eq('id', gymId)
  redirect('/admin/gyms')
}
