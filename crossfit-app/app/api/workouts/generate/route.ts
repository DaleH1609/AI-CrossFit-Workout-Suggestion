// app/api/workouts/generate/route.ts
import { generateWorkouts, generateScaling } from '@/lib/claude/generate-workouts'
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

// Task 4: simple in-memory rate limit — max 3 requests per gym per minute
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 60 * 1000

function isRateLimited(gymId: string): boolean {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const timestamps = (rateLimitMap.get(gymId) ?? []).filter(t => t > windowStart)
  if (timestamps.length >= RATE_LIMIT_MAX) return true
  timestamps.push(now)
  rateLimitMap.set(gymId, timestamps)
  return false
}

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const gymId = userData.gym_id

  if (isRateLimited(gymId)) {
    return NextResponse.json({ error: 'Too many requests. Please wait before generating again.' }, { status: 429 })
  }

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
