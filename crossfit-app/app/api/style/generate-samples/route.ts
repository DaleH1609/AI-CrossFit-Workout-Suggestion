import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

const CROSSFIT_PROMPT = `Generate 3 realistic CrossFit gym workout examples. Each should look like a real whiteboard post — include day, parts (strength + conditioning), movements, sets/reps or time domains, and any time caps. Use plain text with line breaks, the way a coach would write it on a whiteboard. Separate each example with exactly "\n---\n". Return only the workout text, no extra commentary.`

const HYROX_PROMPT = `Generate 3 realistic Hyrox training workout examples. Each should look like a real training session post — include day, station-based work, running intervals, and loading. Use plain text with line breaks. Separate each example with exactly "\n---\n". Return only the workout text, no extra commentary.`

export async function POST() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth

  const { data: gymRow } = await supabase
    .from('gyms')
    .select('gym_type')
    .eq('id', userData.gym_id)
    .single()

  const gymType: 'crossfit' | 'hyrox' =
    gymRow?.gym_type === 'hyrox' ? 'hyrox' : 'crossfit'

  const prompt = gymType === 'hyrox' ? HYROX_PROMPT : CROSSFIT_PROMPT

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let text: string
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })
    text = message.content[0].type === 'text' ? message.content[0].text : ''
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const samples = text
    .split('\n---\n')
    .map(s => s.trim())
    .filter(Boolean)

  if (samples.length === 0) {
    return NextResponse.json({ error: 'Failed to generate samples' }, { status: 500 })
  }

  return NextResponse.json({ samples })
}
