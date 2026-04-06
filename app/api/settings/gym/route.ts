// app/api/settings/gym/route.ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

export async function PATCH(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { gymType } = await req.json()

  if (gymType !== 'crossfit' && gymType !== 'hyrox') {
    return NextResponse.json({ error: 'Invalid gymType' }, { status: 400 })
  }

  const { error } = await supabase
    .from('gyms').update({ gym_type: gymType }).eq('id', userData.gym_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
