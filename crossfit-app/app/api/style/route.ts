import { NextResponse } from 'next/server'
import { requireOwnerAuth, requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'

export async function GET() {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { data } = await supabase.from('style_examples').select('*')
    .eq('gym_id', userData.gym_id).is('archived_at', null).order('created_at')
  return NextResponse.json({ examples: data })
}

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { rawText } = await req.json()
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
