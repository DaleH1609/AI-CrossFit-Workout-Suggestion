import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { requireOwnerAuth, requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'

export async function GET() {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { data: examples } = await supabase.from('style_examples').select('*')
    .eq('gym_id', userData.gym_id).is('archived_at', null).order('created_at')

  const { data: gymRow } = await supabase.from('gyms').select('gym_type').eq('id', userData.gym_id).single()
  const gymType: 'crossfit' | 'hyrox' = gymRow?.gym_type === 'hyrox' ? 'hyrox' : 'crossfit'

  return NextResponse.json({ examples, gymType })
}

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { rawText } = await req.json()

  const { data: gymRow } = await supabase.from('gyms').select('gym_type').eq('id', userData.gym_id).single()
  const gymType: 'crossfit' | 'hyrox' = gymRow?.gym_type === 'hyrox' ? 'hyrox' : 'crossfit'
  const gymLabel = gymType === 'hyrox' ? 'Hyrox' : 'CrossFit'

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let validationText = ''
  try {
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
    return NextResponse.json(
      { error: `This doesn't look like a ${gymLabel} workout. Please paste a real ${gymLabel} training session.` },
      { status: 400 }
    )
  }

  const { data } = await supabase.from('style_examples').insert({ gym_id: userData.gym_id, raw_text: rawText }).select().single()
  return NextResponse.json({ example: data })
}

export async function DELETE(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { id } = await req.json()
  await supabase.from('style_examples').delete().eq('id', id).eq('gym_id', userData.gym_id)
  return NextResponse.json({ success: true })
}
