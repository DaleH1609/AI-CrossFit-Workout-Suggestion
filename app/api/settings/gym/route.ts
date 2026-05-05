// app/api/settings/gym/route.ts
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export async function PATCH(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body')
  }

  // Reject unknown keys so the endpoint can never be tricked into writing
  // arbitrary columns — even if future code changes the update pattern.
  const ALLOWED_KEYS = new Set([
    'gymType', 'cancellationCutoffHours', 'defaultCapacity', 'waitlistEnabled',
    'bookingAdvanceHours', 'showMemberNames', 'notifyWorkoutPublished',
    'notifyBookingConfirmed', 'contactEmail',
  ])
  const unknownKeys = Object.keys(body).filter(k => !ALLOWED_KEYS.has(k))
  if (unknownKeys.length > 0) return jsonError(`Unknown field(s): ${unknownKeys.join(', ')}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}

  if ('gymType' in body) {
    if (body.gymType !== 'crossfit' && body.gymType !== 'hyrox') {
      return jsonError('Invalid gymType')
    }
    updates.gym_type = body.gymType
  }

  if ('cancellationCutoffHours' in body) {
    const val = Number(body.cancellationCutoffHours)
    if (!Number.isInteger(val) || val < 0 || val > 72) {
      return jsonError('Invalid cancellation cutoff')
    }
    updates.cancellation_cutoff_hours = val
  }

  if ('defaultCapacity' in body) {
    const val = Number(body.defaultCapacity)
    if (!Number.isInteger(val) || val < 1 || val > 200) {
      return jsonError('Invalid capacity')
    }
    updates.default_capacity = val
  }

  if ('waitlistEnabled' in body) {
    updates.waitlist_enabled = Boolean(body.waitlistEnabled)
  }

  if ('bookingAdvanceHours' in body) {
    const val = Number(body.bookingAdvanceHours)
    if (!Number.isInteger(val) || val < 0 || val > 720) {
      return jsonError('Invalid booking advance hours')
    }
    updates.booking_advance_hours = val
  }

  if ('showMemberNames' in body) {
    updates.show_member_names = Boolean(body.showMemberNames)
  }

  if ('notifyWorkoutPublished' in body) {
    updates.notify_workout_published = Boolean(body.notifyWorkoutPublished)
  }

  if ('notifyBookingConfirmed' in body) {
    updates.notify_booking_confirmed = Boolean(body.notifyBookingConfirmed)
  }

  if ('contactEmail' in body) {
    const val = body.contactEmail as string
    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      return jsonError('Invalid email address')
    }
    updates.contact_email = val || null
  }

  if (Object.keys(updates).length === 0) {
    return jsonError('Nothing to update')
  }

  const { error } = await supabase.from('gyms').update(updates).eq('id', userData.gym_id)
  if (error) return jsonServerError('settings/gym PATCH', error)

  return jsonOk({ success: true })
}
