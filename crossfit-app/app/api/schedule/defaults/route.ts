import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import type { GymScheduleDefault } from '@/lib/types'

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { dayOfWeek, capacity } = await req.json()

  if (typeof capacity !== 'number' || capacity < 1 || capacity > 200) {
    return NextResponse.json({ error: 'Capacity must be between 1 and 200' }, { status: 400 })
  }

  // dayOfWeek: null = global default, 1–7 = per-day default
  if (dayOfWeek !== null && (typeof dayOfWeek !== 'number' || dayOfWeek < 1 || dayOfWeek > 7)) {
    return NextResponse.json({ error: 'dayOfWeek must be null or 1–7' }, { status: 400 })
  }

  const { error } = await (supabase.from('gym_schedule_defaults') as unknown as {
    upsert(row: GymScheduleDefault, options: { onConflict: string }): Promise<{ error: null | { message: string } }>
  }).upsert(
      { gym_id: userData.gym_id, day_of_week: dayOfWeek ?? null, default_capacity: capacity },
      { onConflict: 'gym_id,day_of_week' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { dayOfWeek } = await req.json()

  // Only per-day defaults can be deleted (null = global; don't allow deleting global)
  if (typeof dayOfWeek !== 'number' || dayOfWeek < 1 || dayOfWeek > 7) {
    return NextResponse.json({ error: 'dayOfWeek must be 1–7' }, { status: 400 })
  }

  const { error } = await supabase.from('gym_schedule_defaults')
    .delete()
    .eq('gym_id', userData.gym_id)
    .eq('day_of_week', dayOfWeek)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
