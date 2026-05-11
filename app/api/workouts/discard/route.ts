// app/api/workouts/discard/route.ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { z } from '@/lib/validation/z'
import { parseBody, jsonOk, jsonServerError } from '@/lib/api/response'
import { auditLog } from '@/lib/audit/gym-log'

const schema = z.object({ weekId: z.uuid() })

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, user, userData } = auth
  const parsed = await parseBody(req, schema)
  if (parsed instanceof NextResponse) return parsed

  const { error } = await supabase.from('workout_weeks')
    .update({ status: 'discarded' })
    .eq('id', parsed.weekId).eq('gym_id', userData.gym_id).eq('status', 'draft')

  if (error) return jsonServerError('workouts/discard', error)
  auditLog({ gymId: userData.gym_id, actorId: user.id, action: 'workout.discard', targetId: parsed.weekId, targetType: 'workout' })
  return jsonOk({ success: true })
}
