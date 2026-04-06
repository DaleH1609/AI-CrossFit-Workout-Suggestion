import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

export async function POST() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const now = new Date().toISOString()
  await supabase.from('style_examples').update({ archived_at: now }).eq('gym_id', userData.gym_id).is('archived_at', null)
  await supabase.from('workout_weeks').update({ archived_at: now }).eq('gym_id', userData.gym_id).is('archived_at', null)
  return NextResponse.json({ success: true })
}
