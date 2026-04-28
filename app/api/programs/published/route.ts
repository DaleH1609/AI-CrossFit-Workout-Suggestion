import { requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { z } from '@/lib/validation/z'

export async function GET(req: Request) {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('weekStart')
  const weekStartValidation = z.isoDate().parse(weekStart)
  if (!weekStart || !weekStartValidation.ok) {
    return jsonError('weekStart query param is required and must be YYYY-MM-DD', 400)
  }

  const { data, error } = await supabase
    .from('specialty_programs')
    .select('id, gym_id, name, week_start, days, status, created_at, updated_at')
    .eq('gym_id', userData.gym_id)
    .eq('week_start', weekStart)
    .eq('status', 'published')
    .order('name', { ascending: true })

  if (error) return jsonServerError('programs/published GET', error)
  return jsonOk({ programs: data ?? [] })
}
