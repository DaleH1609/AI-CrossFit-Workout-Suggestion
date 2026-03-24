import { NextResponse } from 'next/server'
import { requireOwnerAuth, requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'

export async function GET() {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { data } = await supabase.from('class_slot_templates').select('*')
    .eq('gym_id', userData.gym_id).eq('active', true).order('day_of_week').order('local_time')
  return NextResponse.json({ templates: data })
}

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { dayOfWeek, localTime, capacity } = await req.json()
  const { data } = await supabase.from('class_slot_templates')
    .insert({ gym_id: userData.gym_id, day_of_week: dayOfWeek, local_time: localTime, capacity })
    .select().single()
  return NextResponse.json({ template: data })
}

export async function PATCH(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { id, capacity } = await req.json()
  if (typeof capacity !== 'number' || capacity < 1 || capacity > 200) {
    return NextResponse.json({ error: 'Capacity must be between 1 and 200' }, { status: 400 })
  }
  const { data, error } = await supabase.from('class_slot_templates')
    .update({ capacity })
    .eq('id', id)
    .eq('gym_id', userData.gym_id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { id } = await req.json()
  await supabase.from('class_slot_templates').update({ active: false }).eq('id', id).eq('gym_id', userData.gym_id)
  return NextResponse.json({ success: true })
}
