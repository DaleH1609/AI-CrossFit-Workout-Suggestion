// app/api/workouts/generate/route.ts
import { createClient } from '@/lib/supabase/server'
import { generateWorkouts } from '@/lib/claude/generate-workouts'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get gym
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const gymId = userData.gym_id
  const { weekStart } = await req.json()
  if (!weekStart || typeof weekStart !== 'string') {
    return NextResponse.json({ error: 'weekStart is required' }, { status: 400 })
  }

  // Get style examples (active only)
  const { data: examples } = await supabase
    .from('style_examples').select('raw_text')
    .eq('gym_id', gymId).is('archived_at', null)

  if (!examples || examples.length < 3) {
    return NextResponse.json({ error: 'Need at least 3 style examples' }, { status: 400 })
  }

  // Get last 4 published weeks (not archived)
  const { data: history } = await supabase
    .from('workout_weeks').select('workouts')
    .eq('gym_id', gymId).eq('status', 'published').is('archived_at', null)
    .order('week_start', { ascending: false }).limit(4)

  const historyWeeks = (history || []).map(h => h.workouts).reverse()
  const styleTexts = examples.map(e => e.raw_text)

  // Delete any existing draft for this week
  await supabase.from('workout_weeks')
    .update({ status: 'discarded' })
    .eq('gym_id', gymId).eq('week_start', weekStart).eq('status', 'draft')

  let workouts
  try {
    workouts = await generateWorkouts(styleTexts, historyWeeks)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { data: week, error } = await supabase.from('workout_weeks')
    .insert({ gym_id: gymId, week_start: weekStart, workouts, status: 'draft' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ week })
}
