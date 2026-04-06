// app/api/workouts/approve/route.ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { sendWorkoutsPublishedEmail } from '@/lib/email/send'

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { weekId } = await req.json()

  const { data: published, error } = await supabase.from('workout_weeks')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', weekId).eq('gym_id', userData.gym_id).eq('status', 'draft')
    .select('id').single()

  if (error || !published) return NextResponse.json({ error: 'Week not found or already published' }, { status: 404 })

  // Send email to all active members (fire-and-forget — email failure should not fail approval)
  try {
    const { data: members } = await supabase.from('users')
      .select('email, name').eq('gym_id', userData.gym_id)
      .eq('role', 'member').is('revoked_at', null)
    if (members) await sendWorkoutsPublishedEmail(members)
  } catch {
    // Email failure is non-fatal — approval already succeeded
  }

  return NextResponse.json({ success: true })
}
