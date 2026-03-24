// app/api/workouts/[weekId]/day/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { WorkoutDay } from '@/lib/types'

export async function PATCH(
  req: Request,
  { params }: { params: { weekId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('gym_id, role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { dayName, updatedDay }: { dayName: string; updatedDay: WorkoutDay } = await req.json()

  if (!dayName || !updatedDay) {
    return NextResponse.json({ error: 'dayName and updatedDay are required' }, { status: 400 })
  }

  // Fetch the week, verifying gym ownership and draft status
  const { data: week, error: fetchError } = await supabase
    .from('workout_weeks')
    .select('id, workouts, status')
    .eq('id', params.weekId)
    .eq('gym_id', userData.gym_id)
    .single()

  if (fetchError || !week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 })
  }

  if (week.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft weeks can be edited' }, { status: 409 })
  }

  // Replace the matching day in the workouts JSONB array
  const workouts: WorkoutDay[] = week.workouts as WorkoutDay[]
  const idx = workouts.findIndex(d => d.day === dayName)
  if (idx === -1) {
    return NextResponse.json({ error: `Day "${dayName}" not found in this week` }, { status: 404 })
  }

  const updatedWorkouts = [...workouts]
  updatedWorkouts[idx] = updatedDay

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
