import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { getAnthropicClient } from '@/lib/claude/client'
import { rateLimit } from '@/lib/rate-limit'
import { checkAiLimit, incrementAiCalls } from '@/lib/ai/spend-limit'

const CROSSFIT_PROMPT = `Generate 3 realistic CrossFit gym workout examples. Each should look like a real whiteboard post — include day, parts (strength + conditioning), movements, sets/reps or time domains, and any time caps. Use plain text with line breaks, the way a coach would write it on a whiteboard. Separate each example with exactly "\n---\n". Return only the workout text, no extra commentary.`

const HYROX_PROMPT = `Generate 3 realistic Hyrox training workout examples. Each should look like a real training session post — include day, station-based work, running intervals, and loading. Use plain text with line breaks. Separate each example with exactly "\n---\n". Return only the workout text, no extra commentary.`

export async function POST() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth

  const { limited } = await rateLimit(userData.gym_id, 'ai')
  if (limited) return jsonError('Too many requests. Please wait before generating again.', 429)

  const { limited: atLimit } = await checkAiLimit(userData.gym_id)
  if (atLimit) return jsonError('Monthly AI generation limit reached. Resets at the start of next month.', 429)

  const { data: gymRow } = await supabase
    .from('gyms')
    .select('gym_type')
    .eq('id', userData.gym_id)
    .single()

  const gymType: 'crossfit' | 'hyrox' =
    gymRow?.gym_type === 'hyrox' ? 'hyrox' : 'crossfit'

  const prompt = gymType === 'hyrox' ? HYROX_PROMPT : CROSSFIT_PROMPT

  let text: string
  try {
    const client = getAnthropicClient()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })
    text = message.content[0].type === 'text' ? message.content[0].text : ''
  } catch (err) {
    return jsonServerError('style/generate-samples', err)
  }

  const samples = text
    .split('\n---\n')
    .map(s => s.trim())
    .filter(Boolean)

  if (samples.length === 0) {
    return jsonServerError('style/generate-samples', new Error('No samples produced'))
  }

  incrementAiCalls(userData.gym_id).catch(err => console.error('[style/generate-samples] incrementAiCalls failed', err))
  return jsonOk({ samples })
}
