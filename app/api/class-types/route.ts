import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { z } from '@/lib/validation/z'
import { parseBody, jsonOk, jsonServerError } from '@/lib/api/response'

const DEFAULT_WOD_COLOR = '#eab308'
// Accept 3- or 6-digit hex colors (with optional alpha) — lenient but stops obvious garbage.
const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

export async function GET() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth

  const { data: types } = await supabase
    .from('class_types')
    .select('id, name, color')
    .eq('gym_id', userData.gym_id)
    .order('created_at')

  return jsonOk({ classTypes: types ?? [] })
}

const postSchema = z.object({
  name: z.string({ min: 1, max: 40, trim: true }),
  color: z.string({ pattern: COLOR_RE }).optional(),
})

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const parsed = await parseBody(req, postSchema)
  if (parsed instanceof NextResponse) return parsed

  const { data, error } = await supabase
    .from('class_types')
    .insert({ gym_id: userData.gym_id, name: parsed.name, color: parsed.color ?? DEFAULT_WOD_COLOR })
    .select('id, name, color')
    .single()

  if (error) return jsonServerError('class-types POST', error)
  return jsonOk({ classType: data })
}

const patchSchema = z.object({
  id: z.uuid(),
  name: z.string({ min: 1, max: 40, trim: true }).optional(),
  color: z.string({ pattern: COLOR_RE }).optional(),
})

export async function PATCH(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const parsed = await parseBody(req, patchSchema)
  if (parsed instanceof NextResponse) return parsed

  const updates: Record<string, string> = {}
  if (parsed.name !== undefined) updates.name = parsed.name || 'WOD'
  if (parsed.color !== undefined) updates.color = parsed.color

  const { data, error } = await supabase
    .from('class_types')
    .update(updates)
    .eq('id', parsed.id)
    .eq('gym_id', userData.gym_id)
    .select('id, name, color')
    .single()

  if (error) return jsonServerError('class-types PATCH', error)
  return jsonOk({ classType: data })
}

const deleteSchema = z.object({ id: z.uuid() })

export async function DELETE(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const parsed = await parseBody(req, deleteSchema)
  if (parsed instanceof NextResponse) return parsed

  // Null out the FK on any templates using this type before deleting
  await supabase
    .from('class_slot_templates')
    .update({ class_type_id: null })
    .eq('class_type_id', parsed.id)
    .eq('gym_id', userData.gym_id)

  const { error } = await supabase
    .from('class_types')
    .delete()
    .eq('id', parsed.id)
    .eq('gym_id', userData.gym_id)

  if (error) return jsonServerError('class-types DELETE', error)
  return jsonOk({ success: true })
}
