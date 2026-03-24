// app/api/workouts/generate/route.ts
import { createClient } from '@/lib/supabase/server'
import { generateWorkouts, generateScaling } from '@/lib/claude/generate-workouts'
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

  // Get gym row (including gym_type)
  const { data: gymRow } = await supabase.from('gyms').select('gym_type').eq('id', gymId).single()
  const gymType: 'crossfit' | 'hyrox' =
    gymRow?.gym_type === 'hyrox' ? 'hyrox' : 'crossfit'

  // Get style examples (active only)
  const { data: examples } = await supabase
    .from('style_examples').select('raw_text')
    .eq('gym_id', gymId).is('archived_at', null)

  // If fewer than 3 examples, use built-in prompt for the gym type (no 400 error)
  const styleTexts = (examples || []).map(e => e.raw_text)

  // Get last 4 published weeks (not archived)
  const { data: history } = await supabase
    .from('workout_weeks').select('workouts')
    .eq('gym_id', gymId).eq('status', 'published').is('archived_at', null)
    .order('week_start', { ascending: false }).limit(4)

  const historyWeeks = (history || []).map(h => h.workouts).reverse()

  // Delete any existing draft for this week
  await supabase.from('workout_weeks')
    .update({ status: 'discarded' })
    .eq('gym_id', gymId).eq('week_start', weekStart).eq('status', 'draft')

  let workouts
  try {
    workouts = await generateWorkouts(styleTexts, historyWeeks, gymType)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Auto-scaling — non-blocking: failure does not prevent saving
  try {
    workouts = await generateScaling(workouts)
  } catch {
    // Scaling failed — save without scaling
  }

  const { data: week, error } = await supabase.from('workout_weeks')
    .insert({ gym_id: gymId, week_start: weekStart, workouts, status: 'draft' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ week })
}
