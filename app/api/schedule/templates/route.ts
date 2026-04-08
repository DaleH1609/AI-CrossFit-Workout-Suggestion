import { NextResponse } from 'next/server'
import { requireOwnerAuth, requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'
import type { GymScheduleDefault } from '@/lib/types'

export async function GET() {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth

  const [{ data: templates }, { data: defaults }] = await Promise.all([
    supabase.from('class_slot_templates').select('*')
      .eq('gym_id', userData.gym_id).eq('active', true)
      .order('day_of_week').order('local_time'),
    (supabase.from('gym_schedule_defaults').select('*')
      .eq('gym_id', userData.gym_id) as unknown) as Promise<{ data: GymScheduleDefault[] | null }>,
  ])

  const globalRow = (defaults as GymScheduleDefault[] | null)?.find(d => d.day_of_week === null)
  const globalDefault = globalRow?.default_capacity ?? 20

  const dayDefaults: Record<string, number> = {}
  for (const d of (defaults as GymScheduleDefault[] | null) ?? []) {
    if (d.day_of_week !== null) {
      dayDefaults[String(d.day_of_week)] = d.default_capacity
    }
  }

  return NextResponse.json({ templates: templates ?? [], globalDefault, dayDefaults })
}

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { dayOfWeek, localTime, capacity, classTypeId, name } = await req.json()
  const { data } = await supabase.from('class_slot_templates')
    .insert({
      gym_id: userData.gym_id,
      day_of_week: dayOfWeek,
      local_time: localTime,
      capacity: capacity ?? null,
      name: name ?? 'WOD',
      workout_notes: null,
      class_type_id: classTypeId ?? null,
    })
    .select().single()
  return NextResponse.json({ template: data })
}

export async function PATCH(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { id, capacity, name, workout_notes, class_type_id } = await req.json()

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  if (capacity !== null && capacity !== undefined && (typeof capacity !== 'number' || capacity < 1 || capacity > 200)) {
    return NextResponse.json({ error: 'Capacity must be between 1 and 200' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (capacity !== undefined) updates.capacity = capacity ?? null
  if (name !== undefined) updates.name = String(name).trim() || 'WOD'
  if (workout_notes !== undefined) updates.workout_notes = workout_notes || null
  if (class_type_id !== undefined) updates.class_type_id = class_type_id ?? null

  const { data, error } = await supabase.from('class_slot_templates')
    .update(updates)
    .eq('id', id)
    .eq('gym_id', userData.gym_id)
    .select().single()
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
