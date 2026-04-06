// app/api/workouts/discard/route.ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { weekId } = await req.json()

  const { error } = await supabase.from('workout_weeks')
    .update({ status: 'discarded' })
    .eq('id', weekId).eq('gym_id', userData.gym_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
