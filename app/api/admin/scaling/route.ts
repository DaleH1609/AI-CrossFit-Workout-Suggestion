export const dynamic = 'force-dynamic'
// F3: Per-member AI scaling suggestions
// Coach/owner pastes in a workout and selects a member — Claude generates
// personalised scaling notes based on the member's score history and skill level.
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAnthropicClient } from '@/lib/claude/client'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { checkAiLimit, incrementAiCalls } from '@/lib/ai/spend-limit'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (!data || !['owner', 'admin'].includes(data.role ?? '')) return null
  return { gymId: data.gym_id as string }
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth) return jsonError('Unauthorized', 401)

  const body = await req.json().catch(() => ({}))
  const { memberId, workoutText } = body as { memberId?: string; workoutText?: string }
  if (!memberId) return jsonError('memberId is required')
  if (!workoutText?.trim()) return jsonError('workoutText is required')

  const supabase = createAdminClient()

  // AI spend-limit check
  try {
    const { limited } = await checkAiLimit(auth.gymId, supabase)
    if (limited) return jsonError('Monthly AI limit reached. Resets next month.', 429)
  } catch {
    // spend-limit unavailable — proceed
  }

  try {
    // Fetch member profile
    const { data: member } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', memberId)
      .eq('gym_id', auth.gymId)
      .single()

    if (!member) return jsonError('Member not found', 404)

    // Fetch recent scores (last 20)
    const { data: scores } = await supabase
      .from('workout_scores')
      .select('workout_name, score_value, score_unit, rx, notes, logged_at')
      .eq('user_id', memberId)
      .order('logged_at', { ascending: false })
      .limit(20)

    // Fetch skills
    const { data: skills } = await supabase
      .from('member_skills')
      .select('skills(name, category), level, notes')
      .eq('user_id', memberId)

    // Build concise context string
    const scoreLines = (scores ?? [])
      .map((s: { workout_name: string; score_value: number | null; score_unit: string; rx: boolean; notes: string | null; logged_at: string }) =>
        `- ${s.workout_name}: ${s.score_value ?? '?'} ${s.score_unit}${s.rx ? ' (RX)' : ' (scaled)'}${s.notes ? ` — ${s.notes}` : ''}`)
      .join('\n') || 'No scores logged yet.'

    const skillLines = (skills ?? [])
      .map((s: { skills: { name: string; category: string } | null; level: string; notes: string | null }) => {
        const skillName = s.skills?.name ?? 'Unknown'
        return `- ${skillName}: ${s.level}${s.notes ? ` (${s.notes})` : ''}`
      })
      .join('\n') || 'No skills recorded yet.'

    const memberName = (member as { name: string; email: string }).name || (member as { name: string; email: string }).email

    const prompt = `You are an expert CrossFit coach creating personalised scaling options for a specific member.

MEMBER: ${memberName}

RECENT SCORES:
${scoreLines}

SKILLS / MOVEMENTS:
${skillLines}

TODAY'S WORKOUT:
${workoutText.trim()}

Based on this member's history, provide:
1. A recommended scaling (weights, movements, time cap if relevant)
2. A 1-2 sentence rationale referencing their specific history
3. One coaching cue to focus on

Be specific and brief. Use CrossFit shorthand (e.g., "65/45 kg thrusters", "jumping pull-ups", "banded HSPU"). Do not repeat the full workout — only list what changes.`

    const client = getAnthropicClient()
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const scaling = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n')
      .trim()

    await incrementAiCalls(auth.gymId, supabase, { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens }).catch(() => {})

    return jsonOk({ memberName, scaling })
  } catch (err) {
    return jsonServerError('Failed to generate scaling', err)
  }
}
