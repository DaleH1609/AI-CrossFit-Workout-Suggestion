// app/api/workouts/[weekId]/day/route.ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { generateDayScaling } from '@/lib/claude/generate-workouts'
import type { WorkoutDay } from '@/lib/types'

export const maxDuration = 60

export async function PATCH(
  req: Request,
  { params }: { params: { weekId: string } }
) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { dayName, updatedDay, skipScaling }: { dayName: string; updatedDay: WorkoutDay; skipScaling?: boolean } = await req.json()

  if (!dayName || !updatedDay) {
    return NextResponse.json({ error: 'dayName and updatedDay are required' }, { status: 400 })
  }

  // Fetch the week, verifying gym ownership — only draft weeks may be edited
  const { data: week, error: fetchError } = await supabase
    .from('workout_weeks')
    .select('id, workouts, status')
    .eq('id', params.weekId)
    .eq('gym_id', userData.gym_id)
    .eq('status', 'draft')
    .single()

  if (fetchError || !week) {
    return NextResponse.json({ error: 'Week not found or is not a draft' }, { status: 404 })
  }

  // Replace the matching day in the workouts JSONB array
  const workouts: WorkoutDay[] = week.workouts as WorkoutDay[]
  const idx = workouts.findIndex(d => d.day === dayName)
  if (idx === -1) {
    return NextResponse.json({ error: `Day "${dayName}" not found in this week` }, { status: 404 })
  }

  // Regenerate scaling unless the client provided manual scaling
  let dayToSave = updatedDay
  if (!skipScaling) {
    try {
      dayToSave = await generateDayScaling(updatedDay)
    } catch {
      // Scaling failed — save without it
    }
  }

  const updatedWorkouts = [...workouts]
  updatedWorkouts[idx] = dayToSave

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
