import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const now = new Date().toISOString()
  await supabase.from('style_examples').update({ archived_at: now }).eq('gym_id', userData.gym_id).is('archived_at', null)
  await supabase.from('workout_weeks').update({ archived_at: now }).eq('gym_id', userData.gym_id).is('archived_at', null)
  return NextResponse.json({ success: true })
}
