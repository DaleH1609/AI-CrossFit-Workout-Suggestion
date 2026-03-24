import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  const { data } = await supabase.from('class_slot_templates').select('*')
    .eq('gym_id', (userData as any)!.gym_id).eq('active', true).order('day_of_week').order('local_time')
  return NextResponse.json({ templates: data })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if ((userData as any)?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { dayOfWeek, localTime, capacity } = await req.json()
  const { data } = await supabase.from('class_slot_templates')
    .insert({ gym_id: (userData as any).gym_id, day_of_week: dayOfWeek, local_time: localTime, capacity })
    .select().single()
  return NextResponse.json({ template: data })
}

export async function DELETE(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if ((userData as any)?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await supabase.from('class_slot_templates').update({ active: false }).eq('id', id).eq('gym_id', (userData as any).gym_id)
  return NextResponse.json({ success: true })
}
