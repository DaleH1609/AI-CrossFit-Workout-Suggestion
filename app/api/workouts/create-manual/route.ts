import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { userData } = auth
  const gymId = userData.gym_id

  const { weekStart } = await req.json()
  if (!weekStart || typeof weekStart !== 'string') {
    return NextResponse.json({ error: 'weekStart is required' }, { status: 400 })
  }

  const workouts = DAYS.map(day => ({
    day,
    descriptor: '',
    parts: [{ label: null, type: 'strength', content: '' }],
  }))

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await admin.rpc('save_workout_draft', {
    p_gym_id: gymId,
    p_week_start: weekStart,
    p_workouts: workouts,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: savedWeek } = await admin.from('workout_weeks')
    .select('id, workouts, status')
    .eq('gym_id', gymId)
    .eq('week_start', weekStart)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ week: savedWeek ?? { workouts, status: 'draft' } })
}
