import { NextResponse } from 'next/server'
import { requireOwnerAuth, requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'
import { z } from '@/lib/validation/z'
import { parseBody, jsonError, jsonServerError } from '@/lib/api/response'
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

const postSchema = z.object({
  dayOfWeek: z.number({ int: true, min: 1, max: 7 }),
  localTime: z.time(),
  capacity: z.number({ int: true, min: 1, max: 500 }).optional(),
  classTypeId: z.uuid().optional(),
  name: z.string({ min: 1, max: 80, trim: true }).optional(),
})

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const parsed = await parseBody(req, postSchema)
  if (parsed instanceof NextResponse) return parsed

  const { data, error: insertError } = await supabase.from('class_slot_templates')
    .insert({
      gym_id: userData.gym_id,
      day_of_week: parsed.dayOfWeek,
      local_time: parsed.localTime,
      capacity: parsed.capacity ?? null,
      name: parsed.name ?? 'WOD',
      workout_notes: null,
      class_type_id: parsed.classTypeId ?? null,
    })
    .select().single()

  if (insertError || !data) return jsonServerError('schedule/templates POST', insertError)
  return NextResponse.json({ template: data })
}

const patchSchema = z.object({
  id: z.uuid(),
  capacity: z.number({ int: true, min: 1, max: 500 }).optional(),
  name: z.string({ min: 1, max: 80, trim: true }).optional(),
  workout_notes: z.string({ max: 5000 }).optional(),
  class_type_id: z.uuid().optional(),
})

export async function PATCH(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const parsed = await parseBody(req, patchSchema)
  if (parsed instanceof NextResponse) return parsed

  // If capacity is being reduced, make sure it doesn't go below the largest
  // concurrent confirmed booking count on any existing instance from this
  // template. Closes the "capacity can be lowered below current bookings"
  // finding from the member-flow review.
  if (parsed.capacity !== undefined) {
    const { data: instances } = await supabase
      .from('class_instances')
      .select('id')
      .eq('template_id', parsed.id)
      .gte('starts_at', new Date().toISOString()) // only future instances matter

    if (instances && instances.length > 0) {
      const instanceIds = instances.map(i => i.id)
      // Find max confirmed+pending bookings per instance
      const { data: booked } = await supabase
        .from('bookings')
        .select('instance_id')
        .in('instance_id', instanceIds)
        .in('status', ['confirmed', 'pending_confirmation'])

      const counts = new Map<string, number>()
      for (const b of booked ?? []) {
        counts.set(b.instance_id, (counts.get(b.instance_id) ?? 0) + 1)
      }
      const peak = counts.size > 0 ? Math.max(...Array.from(counts.values())) : 0

      if (parsed.capacity < peak) {
        return jsonError(
          `Cannot reduce capacity below ${peak} — that's how many members are already booked into an upcoming class`,
          400
        )
      }
    }
  }

  const updates: Record<string, unknown> = {}
  if (parsed.capacity !== undefined) updates.capacity = parsed.capacity
  if (parsed.name !== undefined) updates.name = parsed.name || 'WOD'
  if (parsed.workout_notes !== undefined) updates.workout_notes = parsed.workout_notes || null
  if (parsed.class_type_id !== undefined) updates.class_type_id = parsed.class_type_id

  const { data, error } = await supabase.from('class_slot_templates')
    .update(updates)
    .eq('id', parsed.id)
    .eq('gym_id', userData.gym_id)
    .select().single()

  if (error) return jsonServerError('schedule/templates PATCH', error)
  return NextResponse.json({ template: data })
}

const deleteSchema = z.object({ id: z.uuid() })

export async function DELETE(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const parsed = await parseBody(req, deleteSchema)
  if (parsed instanceof NextResponse) return parsed

  const { error: deleteError } = await supabase
    .from('class_slot_templates')
    .update({ active: false })
    .eq('id', parsed.id)
    .eq('gym_id', userData.gym_id)

  if (deleteError) return jsonServerError('schedule/templates DELETE', deleteError)
  return NextResponse.json({ success: true })
}
