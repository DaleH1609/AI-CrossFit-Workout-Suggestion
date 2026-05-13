// app/api/workouts/generate/route.ts
import { generateWorkouts, generateScaling, generateRationale } from '@/lib/claude/generate-workouts'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { getRecentWeeks } from '@/lib/workouts/get-recent-weeks'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { rateLimit } from '@/lib/rate-limit'
import { checkAiLimit, incrementAiCalls } from '@/lib/ai/spend-limit'

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const gymId = userData.gym_id

  const { limited } = await rateLimit(gymId, 'ai')
  if (limited) return jsonError('Too many requests. Please wait before generating again.', 429)

  const { limited: atLimit } = await checkAiLimit(gymId, supabase)
  if (atLimit) return jsonError('Monthly AI generation limit reached. Resets at the start of next month.', 429)

  let body: { weekStart?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body')
  }
  const { weekStart } = body
  if (!weekStart || typeof weekStart !== 'string') {
    return jsonError('weekStart is required')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return jsonError('weekStart must be YYYY-MM-DD')
  }
  if (new Date(weekStart + 'T12:00:00Z').getUTCDay() !== 1) {
    return jsonError('weekStart must be a Monday')
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

  // Fetch recent coach edits to inform generation
  const { data: editRows } = await supabase
    .from('workout_edits')
    .select('day_name, field, before_text, after_text')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(20)
  const editHistory = editRows ?? []

  let workouts
  let totalTokens = { inputTokens: 0, outputTokens: 0 }
  try {
    const generated = await generateWorkouts(styleTexts, historyWeeks, gymType, editHistory)
    workouts = generated.workouts
    totalTokens = generated.usage
  } catch (err) {
    return jsonServerError('workouts/generate generateWorkouts', err)
  }


  // Auto-scaling — non-blocking: failure does not prevent saving
  try {
    const scaled = await generateScaling(workouts)
    workouts = scaled.workouts
    totalTokens = { inputTokens: totalTokens.inputTokens + scaled.usage.inputTokens, outputTokens: totalTokens.outputTokens + scaled.usage.outputTokens }
  } catch (scalingErr) {
    console.warn('[workouts/generate] scaling failed, saving without scaling', scalingErr)
  }

  // Generate rationale (non-blocking — failure does not prevent save)
  let rationale = null
  try {
    const rationaleResult = await generateRationale(workouts, historyWeeks, gymType)
    rationale = rationaleResult.rationale
    totalTokens = { inputTokens: totalTokens.inputTokens + rationaleResult.usage.inputTokens, outputTokens: totalTokens.outputTokens + rationaleResult.usage.outputTokens }
  } catch (rationaleErr) {
    console.warn('[workouts/generate] rationale generation failed', rationaleErr)
  }

  // Count one generation against the monthly ceiling (fire-and-forget)
  incrementAiCalls(gymId, supabase, { inputTokens: totalTokens.inputTokens, outputTokens: totalTokens.outputTokens })
    .catch(err => console.error('[workouts/generate] incrementAiCalls failed', err))

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
  const admin = createAdminClient()


  // Call atomic SQL function (SECURITY DEFINER bypasses RLS completely)
  const { error } = await admin.rpc('save_workout_draft' as never, {
    p_gym_id: gymId,
    p_week_start: weekStart,
    p_workouts: workouts,
    p_rationale: rationale,
  } as never)

  if (error) return jsonServerError('workouts/generate save_workout_draft', error)

  // Fetch the saved row so the client gets the real DB id
  const { data: savedWeek } = await admin.from('workout_weeks')
    .select('id, workouts, status, rationale')
    .eq('gym_id', gymId)
    .eq('week_start', weekStart)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return jsonOk({ week: savedWeek ?? { workouts, status: 'draft', rationale } })
}
