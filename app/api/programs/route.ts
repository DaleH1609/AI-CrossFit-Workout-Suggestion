import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { z } from '@/lib/validation/z'
import { parseBody, jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export async function GET() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { data, error } = await supabase
    .from('specialty_programs')
    .select('*')
    .eq('gym_id', userData.gym_id)
    .order('week_start', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return jsonServerError('programs GET', error)
  return jsonOk({ programs: data ?? [] })
}

const postSchema = z.object({
  name: z.string({ min: 1, max: 80, trim: true }),
  weekStart: z.isoDate(),
})

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const parsed = await parseBody(req, postSchema)
  if (parsed instanceof NextResponse) return parsed

  const emptyDays = DAYS.map(day => ({ day, content: '' }))

  const { data, error } = await supabase
    .from('specialty_programs')
    .insert({
      gym_id: userData.gym_id,
      name: parsed.name,
      week_start: parsed.weekStart,
      days: emptyDays,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return jsonError('A program with this name already exists for that week', 409)
    return jsonServerError('programs POST', error)
  }
  return jsonOk({ program: data })
}
