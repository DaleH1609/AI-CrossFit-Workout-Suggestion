// app/api/workouts/discard/route.ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { z } from '@/lib/validation/z'
import { parseBody, jsonOk, jsonServerError } from '@/lib/api/response'

const schema = z.object({ weekId: z.uuid() })

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const parsed = await parseBody(req, schema)
  if (parsed instanceof NextResponse) return parsed

  const { error } = await supabase.from('workout_weeks')
    .update({ status: 'discarded' })
    .eq('id', parsed.weekId).eq('gym_id', userData.gym_id)

  if (error) return jsonServerError('workouts/discard', error)
  return jsonOk({ success: true })
}
