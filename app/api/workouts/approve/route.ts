// app/api/workouts/approve/route.ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { sendWorkoutsPublishedEmail } from '@/lib/email/send'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from '@/lib/validation/z'
import { parseBody, jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { dispatchWebhooks } from '@/lib/webhooks/dispatch'
import { auditLog } from '@/lib/audit/gym-log'
import { sendPushToGym } from '@/lib/push/send'

const schema = z.object({ weekId: z.uuid() })

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, user, userData } = auth
  const gymId = userData.gym_id
  const parsed = await parseBody(req, schema)
  if (parsed instanceof NextResponse) return parsed
  const { weekId } = parsed

  const { data: draft } = await supabase.from('workout_weeks')
    .select('id, week_start').eq('id', weekId).eq('gym_id', gymId).eq('status', 'draft').single()

  if (!draft) return jsonError('Draft week not found', 404)

  const admin = createAdminClient()

  await admin.from('workout_weeks')
    .update({ status: 'discarded' })
    .eq('gym_id', gymId).eq('week_start', draft.week_start).eq('status', 'published')

  const { data: published, error } = await admin.from('workout_weeks')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', weekId).eq('gym_id', gymId).eq('status', 'draft')
    .select('id').single()

  if (error || !published) return jsonServerError('workouts/approve publish', error)

  // Check notification + contact email settings. Email failure must never
  // roll back the publish, but we do log and surface counts in the response
  // so the operator can detect degraded email delivery.
  let emailStats: { sent: number; failed: number } | null = null
  try {
    const { data: gymRaw } = await supabase.from('gyms')
      .select('notify_workout_published, contact_email, name').eq('id', gymId).single()
    const gym = gymRaw as unknown as { notify_workout_published: boolean; contact_email: string | null; name: string } | null

    if (gym?.notify_workout_published !== false) {
      const { data: members } = await supabase.from('users')
        .select('email, name').eq('gym_id', gymId).eq('role', 'member').is('revoked_at', null)
      if (members) {
        emailStats = await sendWorkoutsPublishedEmail(
          members,
          gym?.name ?? 'Your Gym',
          gym?.contact_email ?? null
        )
      }
    }
  } catch (err) {
    console.error('[workouts/approve] notification failed', err)
  }

  // Fire webhooks + push notifications (non-blocking — failure must not roll back the publish)
  dispatchWebhooks(gymId, 'workout_published', { weekStart: draft.week_start }).catch(err =>
    console.error('[workouts/approve] webhook dispatch failed', err)
  )
  sendPushToGym(gymId, {
    title: 'New workout published! 💪',
    body: `This week's programming is ready — ${draft.week_start}`,
    url: '/this-week',
  }).catch(err => console.error('[workouts/approve] push failed', err))

  auditLog({ gymId: userData.gym_id, actorId: user.id, action: 'workout.publish', targetId: parsed.weekId, targetType: 'workout' })
  return jsonOk({ success: true, emailStats })
}
