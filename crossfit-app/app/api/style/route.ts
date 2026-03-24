import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  const { data } = await supabase.from('style_examples').select('*')
    .eq('gym_id', userData!.gym_id).is('archived_at', null).order('created_at')
  return NextResponse.json({ examples: data })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { rawText } = await req.json()
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data } = await supabase.from('style_examples').insert({ gym_id: userData.gym_id, raw_text: rawText }).select().single()
  return NextResponse.json({ example: data })
}

export async function DELETE(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await supabase.from('style_examples').delete().eq('id', id).eq('gym_id', userData.gym_id)
  return NextResponse.json({ success: true })
}
