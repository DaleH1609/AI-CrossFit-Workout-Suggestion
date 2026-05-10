// lib/audit/gym-log.ts
// Fire-and-forget helper for writing to gym_audit_log via the admin client.
// Failures are logged but never thrown — audit should never block the main request.
import { createAdminClient } from '@/lib/supabase/admin'

export type GymAuditAction =
  | 'member.invite'
  | 'member.revoke'
  | 'member.restore'
  | 'member.delete'
  | 'member.promote_coach'
  | 'member.demote_coach'
  | 'workout.publish'
  | 'workout.discard'
  | 'settings.update'
  | 'lead.status_change'
  | 'deletion_request.actioned'

export function auditLog(opts: {
  gymId: string
  actorId: string
  action: GymAuditAction
  targetId?: string
  targetType?: string
  payload?: Record<string, unknown>
}): void {
  const adb = createAdminClient()
  adb.from('gym_audit_log').insert({
    gym_id: opts.gymId,
    actor_id: opts.actorId,
    action: opts.action,
    target_id: opts.targetId ?? null,
    target_type: opts.targetType ?? null,
    payload: opts.payload ?? null,
  }).then(({ error }) => {
    if (error) console.error('[audit] gym_audit_log insert failed', error)
  })
}
