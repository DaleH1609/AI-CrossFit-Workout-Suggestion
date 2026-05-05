import { NextResponse } from 'next/server'
import { requireOwnerAuth, requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'
import { z } from '@/lib/validation/z'
import { parseBody, jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { getAnthropicClient } from '@/lib/claude/client'
import { rateLimit } from '@/lib/rate-limit'
import { checkAiLimit, incrementAiCalls } from '@/lib/ai/spend-limit'

export async function GET() {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { data: examples } = await supabase.from('style_examples').select('*')
    .eq('gym_id', userData.gym_id).is('archived_at', null).order('created_at')

  const { data: gymRow } = await supabase.from('gyms').select('gym_type').eq('id', userData.gym_id).single()
  const gymType: 'crossfit' | 'hyrox' = gymRow?.gym_type === 'hyrox' ? 'hyrox' : 'crossfit'

  return jsonOk({ examples, gymType })
}

const postSchema = z.object({
  rawText: z.string({ min: 10, max: 20000, trim: true }),
})

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth

  const { limited } = await rateLimit(userData.gym_id, 'ai')
  if (limited) return jsonError('Too many requests. Please wait before generating again.', 429)

  const { limited: atLimit } = await checkAiLimit(userData.gym_id, supabase)
  if (atLimit) return jsonError('Monthly AI generation limit reached. Resets at the start of next month.', 429)

  const parsed = await parseBody(req, postSchema)
  if (parsed instanceof NextResponse) return parsed
  // Strip ASCII control chars — raw_text is plain text only, never rendered as HTML.
  const rawText = parsed.rawText.replace(/[\x00-\x08\x0E-\x1F]/g, '')

  const { data: gymRow } = await supabase.from('gyms').select('gym_type').eq('id', userData.gym_id).single()
  const gymType: 'crossfit' | 'hyrox' = gymRow?.gym_type === 'hyrox' ? 'hyrox' : 'crossfit'
  const gymLabel = gymType === 'hyrox' ? 'Hyrox' : 'CrossFit'

  let validationText = ''
  try {
    const client = getAnthropicClient()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: `Is the following text a ${gymLabel} workout? Answer YES or NO only.\n\n${rawText}` }],
    })
    validationText = msg.content[0].type === 'text' ? msg.content[0].text.trim().toUpperCase() : ''
  } catch {
    // If validation fails, allow the save to proceed rather than blocking the user
  }

  if (validationText === 'NO') {
    return jsonError(`This doesn't look like a ${gymLabel} workout. Please paste a real ${gymLabel} training session.`)
  }

  const { data, error } = await supabase.from('style_examples').insert({ gym_id: userData.gym_id, raw_text: rawText }).select().single()
  if (error) return jsonServerError('style POST', error)
  incrementAiCalls(userData.gym_id, supabase).catch(err => console.error('[style] incrementAiCalls failed', err))
  return jsonOk({ example: data })
}

const deleteSchema = z.object({ id: z.uuid() })

export async function DELETE(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const parsed = await parseBody(req, deleteSchema)
  if (parsed instanceof NextResponse) return parsed
  await supabase.from('style_examples').delete().eq('id', parsed.id).eq('gym_id', userData.gym_id)
  return jsonOk({ success: true })
}
