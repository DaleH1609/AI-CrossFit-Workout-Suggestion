import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import type { GymScheduleDefault } from '@/lib/types'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  let body: { dayOfWeek?: unknown; capacity?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body')
  }
  const { dayOfWeek, capacity } = body

  if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 1 || capacity > 200) {
    return jsonError('Capacity must be between 1 and 200')
  }

  // dayOfWeek: null = global default, 1–7 = per-day default
  if (dayOfWeek !== null && (typeof dayOfWeek !== 'number' || !Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7)) {
    return jsonError('dayOfWeek must be null or 1–7')
  }

  const { error } = await (supabase.from('gym_schedule_defaults') as unknown as {
    upsert(row: GymScheduleDefault, options: { onConflict: string }): Promise<{ error: null | { message: string } }>
  }).upsert(
      { gym_id: userData.gym_id, day_of_week: (dayOfWeek as number | null) ?? null, default_capacity: capacity },
      { onConflict: 'gym_id,day_of_week' }
    )

  if (error) return jsonServerError('schedule/defaults POST', error)
  return jsonOk({ success: true })
}

export async function DELETE(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  let body: { dayOfWeek?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body')
  }
  const { dayOfWeek } = body

  // Only per-day defaults can be deleted (null = global; don't allow deleting global)
  if (typeof dayOfWeek !== 'number' || !Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    return jsonError('dayOfWeek must be 1–7')
  }

  const { error } = await supabase.from('gym_schedule_defaults')
    .delete()
    .eq('gym_id', userData.gym_id)
    .eq('day_of_week', dayOfWeek)

  if (error) return jsonServerError('schedule/defaults DELETE', error)
  return jsonOk({ success: true })
}
