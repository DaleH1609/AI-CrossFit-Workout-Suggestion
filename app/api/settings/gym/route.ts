// app/api/settings/gym/route.ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

export async function PATCH(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const body = await req.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}

  if ('gymType' in body) {
    if (body.gymType !== 'crossfit' && body.gymType !== 'hyrox') {
      return NextResponse.json({ error: 'Invalid gymType' }, { status: 400 })
    }
    updates.gym_type = body.gymType
  }

  if ('cancellationCutoffHours' in body) {
    const val = Number(body.cancellationCutoffHours)
    if (!Number.isInteger(val) || val < 0 || val > 72) {
      return NextResponse.json({ error: 'Invalid cancellation cutoff' }, { status: 400 })
    }
    updates.cancellation_cutoff_hours = val
  }

  if ('defaultCapacity' in body) {
    const val = Number(body.defaultCapacity)
    if (!Number.isInteger(val) || val < 1 || val > 200) {
      return NextResponse.json({ error: 'Invalid capacity' }, { status: 400 })
    }
    updates.default_capacity = val
  }

  if ('waitlistEnabled' in body) {
    updates.waitlist_enabled = Boolean(body.waitlistEnabled)
  }

  if ('bookingAdvanceHours' in body) {
    const val = Number(body.bookingAdvanceHours)
    if (!Number.isInteger(val) || val < 0 || val > 720) {
      return NextResponse.json({ error: 'Invalid booking advance hours' }, { status: 400 })
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
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    updates.contact_email = val || null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase.from('gyms').update(updates).eq('id', userData.gym_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
