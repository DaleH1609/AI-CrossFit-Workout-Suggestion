import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

const DEFAULT_WOD_COLOR = '#eab308'

export async function GET() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth

  const { data: types } = await supabase
    .from('class_types')
    .select('id, name, color')
    .eq('gym_id', userData.gym_id)
    .order('created_at')

  // Seed a default WOD type if the gym has none yet
  if (!types || types.length === 0) {
    const { data: seeded } = await supabase
      .from('class_types')
      .insert({ gym_id: userData.gym_id, name: 'WOD', color: DEFAULT_WOD_COLOR })
      .select('id, name, color')
      .single()
    return NextResponse.json({ classTypes: seeded ? [seeded] : [] })
  }

  return NextResponse.json({ classTypes: types })
}

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { name, color } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('class_types')
    .insert({ gym_id: userData.gym_id, name: name.trim(), color: color || DEFAULT_WOD_COLOR })
    .select('id, name, color')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ classType: data })
}

export async function PATCH(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { id, name, color } = await req.json()

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const updates: Record<string, string> = {}
  if (name !== undefined) updates.name = String(name).trim() || 'WOD'
  if (color !== undefined) updates.color = color

  const { data, error } = await supabase
    .from('class_types')
    .update(updates)
    .eq('id', id)
    .eq('gym_id', userData.gym_id)
    .select('id, name, color')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ classType: data })
}

export async function DELETE(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { id } = await req.json()

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  // Null out the FK on any templates using this type before deleting
  await supabase
    .from('class_slot_templates')
    .update({ class_type_id: null })
    .eq('class_type_id', id)
    .eq('gym_id', userData.gym_id)

  const { error } = await supabase
    .from('class_types')
    .delete()
    .eq('id', id)
    .eq('gym_id', userData.gym_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
