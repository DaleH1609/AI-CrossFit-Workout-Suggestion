// app/api/settings/gym/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { gymType } = await req.json()
  if (gymType !== 'crossfit' && gymType !== 'hyrox') {
    return NextResponse.json({ error: 'Invalid gymType' }, { status: 400 })
  }

  const { error } = await supabase
    .from('gyms').update({ gym_type: gymType }).eq('id', userData.gym_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
