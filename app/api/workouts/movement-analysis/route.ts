// app/api/workouts/movement-analysis/route.ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { getRecentWeeks } from '@/lib/workouts/get-recent-weeks'
import { analyseMovementHistory } from '@/lib/claude/generate-workouts'

export async function GET() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const recentWeeks = await getRecentWeeks(supabase, userData.gym_id)

  if (recentWeeks.length < 2) {
    return NextResponse.json({ insufficient_data: true })
  }

  const analysis = await analyseMovementHistory(recentWeeks)
  if (!analysis) {
    return NextResponse.json({ error: true })
  }

  return NextResponse.json(analysis)
}
