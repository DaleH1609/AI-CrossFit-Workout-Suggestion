import { NextResponse } from 'next/server'
import { requireOwnerAuth } from '@/lib/auth-helpers'
import { jsonOk, jsonError, jsonServerError, isNextResponse } from '@/lib/api/response'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_RE.test(id)) return jsonError('Invalid program id', 400)

  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { data, error } = await supabase
    .from('specialty_programs')
    .select('*')
    .eq('id', id)
    .eq('gym_id', userData.gym_id)
    .single()

  if (error || !data) return jsonError('Program not found', 404)
  return jsonOk({ program: data })
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_RE.test(id)) return jsonError('Invalid program id', 400)

  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }
  const parsed = body as { name?: unknown; days?: unknown }

  // Validate name if provided
  if (parsed.name !== undefined) {
    if (
      typeof parsed.name !== 'string' ||
      parsed.name.trim().length === 0 ||
      parsed.name.trim().length > 80
    ) {
      return jsonError('name must be 1–80 characters', 400)
    }
  }

  // Validate days if provided
  let safeDays: { day: string; content: string }[] | undefined
  if (parsed.days !== undefined) {
    if (!Array.isArray(parsed.days)) return jsonError('days must be an array', 400)
    if (parsed.days.length !== 7) return jsonError('days must have exactly 7 entries', 400)
    const VALID_DAYS = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    for (const entry of parsed.days) {
      if (typeof entry !== 'object' || entry === null) return jsonError('Each day entry must be an object', 400)
      const e = entry as Record<string, unknown>
      if (typeof e.day !== 'string' || !VALID_DAYS.has(e.day)) return jsonError('Invalid day name', 400)
      if (typeof e.content !== 'string' || e.content.length > 5000) return jsonError('content must be a string up to 5000 chars', 400)
    }
    // Strip to only known fields before storing
    safeDays = (parsed.days as Record<string, unknown>[]).map(e => ({
      day: e.day as string,
      content: e.content as string,
    }))
  }

  const updates: Record<string, unknown> = {}
  if (parsed.name !== undefined) updates.name = (parsed.name as string).trim()
  if (safeDays !== undefined) updates.days = safeDays

  if (Object.keys(updates).length === 0) {
    return jsonError('Nothing to update', 400)
  }

  // If days are being updated, use a single atomic conditional UPDATE that only
  // succeeds when status = 'draft', eliminating the TOCTOU race condition.
  if (safeDays !== undefined) {
    const { data, error } = await supabase
      .from('specialty_programs')
      .update(updates)
      .eq('id', id)
      .eq('gym_id', userData.gym_id)
      .eq('status', 'draft')
      .select()
      .single()

    if (!data) {
      // Could be not found OR already published — check which
      const { data: existing } = await supabase
        .from('specialty_programs')
        .select('status')
        .eq('id', id)
        .eq('gym_id', userData.gym_id)
        .single()
      if (!existing) return jsonError('Program not found', 404)
      if (existing.status === 'published') return jsonError('Published programs cannot be edited. Unpublish first.', 409)
      return jsonServerError('programs/[id] PATCH', error)
    }
    return jsonOk({ program: data })
  }

  // Name-only update: no status check needed
  const { data, error } = await supabase
    .from('specialty_programs')
    .update(updates)
    .eq('id', id)
    .eq('gym_id', userData.gym_id)
    .select()
    .single()

  if (error || !data) return jsonServerError('programs/[id] PATCH', error)
  return jsonOk({ program: data })
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_RE.test(id)) return jsonError('Invalid program id', 400)

  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { error } = await supabase
    .from('specialty_programs')
    .delete()
    .eq('id', id)
    .eq('gym_id', userData.gym_id)

  if (error) return jsonServerError('programs/[id] DELETE', error)
  return jsonOk({ success: true })
}
