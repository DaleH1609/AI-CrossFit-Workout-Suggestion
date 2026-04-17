// app/api/workouts/generate/route.ts
import { generateWorkouts, generateScaling } from '@/lib/claude/generate-workouts'
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { getRecentWeeks } from '@/lib/workouts/get-recent-weeks'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: 'weekStart must be YYYY-MM-DD' }, { status: 400 })
  }
  if (new Date(weekStart + 'T12:00:00Z').getUTCDay() !== 1) {
    return NextResponse.json({ error: 'weekStart must be a Monday' }, { status: 400 })
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

  const recentWeeks = await getRecentWeeks(supabase, gymId)
  const historyWeeks = recentWeeks.map(w => w.workouts)

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


  // Final safety net — ensure Saturday and Sunday always have actual content
  function dayHasContent(d: { parts?: { content?: string }[] }) {
    return Array.isArray(d.parts) && d.parts.length > 0 && d.parts.some(p => typeof p.content === 'string' && p.content.trim().length > 10)
  }
  if (!workouts.some((d: { day: string; parts?: { content?: string }[] }) => d.day === 'Saturday' && dayHasContent(d))) {
    workouts = workouts.filter((d: { day: string }) => d.day !== 'Saturday')
    workouts.push({ day: 'Saturday', descriptor: 'Community WOD', parts: [{ label: null, type: 'fortime', content: "Community workout — check with your coach for today's programming." }] })
  }
  if (!workouts.some((d: { day: string; parts?: { content?: string }[] }) => d.day === 'Sunday' && dayHasContent(d))) {
    workouts = workouts.filter((d: { day: string }) => d.day !== 'Sunday')
    workouts.push({ day: 'Sunday', descriptor: 'Rest Day', parts: [{ label: null, type: 'rest', content: 'Active recovery. Light movement, mobility, or complete rest.' }] })
  }

  // Use admin client to bypass RLS — auth already verified above
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )


  // Call atomic SQL function (SECURITY DEFINER bypasses RLS completely)
  const { error } = await admin.rpc('save_workout_draft', {
    p_gym_id: gymId,
    p_week_start: weekStart,
    p_workouts: workouts,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch the saved row so the client gets the real DB id
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
