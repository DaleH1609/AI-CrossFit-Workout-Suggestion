// app/api/workouts/[weekId]/extras/route.ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import type { WorkoutDay, WorkoutExtra } from '@/lib/types'

export async function PATCH(
  req: Request,
  { params }: { params: { weekId: string } }
) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { dayName, extras }: { dayName: string; extras: WorkoutExtra[] } = await req.json()

  if (!dayName || !Array.isArray(extras)) {
    return NextResponse.json({ error: 'dayName and extras are required' }, { status: 400 })
  }

  const { data: week, error: fetchError } = await supabase
    .from('workout_weeks')
    .select('id, workouts, status')
    .eq('id', params.weekId)
    .eq('gym_id', userData.gym_id)
    .single()

  if (fetchError || !week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 })
  }

  const workouts: WorkoutDay[] = week.workouts as WorkoutDay[]
  const idx = workouts.findIndex(d => d.day === dayName)
  if (idx === -1) {
    return NextResponse.json({ error: `Day "${dayName}" not found in this week` }, { status: 404 })
  }

  const updatedWorkouts = [...workouts]
  updatedWorkouts[idx] = { ...updatedWorkouts[idx], extras }

  const { data: saved, error: updateError } = await supabase
    .from('workout_weeks')
    .update({ workouts: updatedWorkouts })
    .eq('id', params.weekId)
    .select('workouts')
    .single()

  if (updateError || !saved) {
    return NextResponse.json({ error: updateError?.message ?? 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ workouts: saved.workouts })
}
