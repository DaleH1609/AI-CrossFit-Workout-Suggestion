// app/api/workouts/approve/route.ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { sendWorkoutsPublishedEmail } from '@/lib/email/send'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const gymId = userData.gym_id
  const { weekId } = await req.json()

  // Get the draft row to find its week_start
  const { data: draft } = await supabase.from('workout_weeks')
    .select('id, week_start').eq('id', weekId).eq('gym_id', gymId).eq('status', 'draft').single()

  if (!draft) return NextResponse.json({ error: 'Draft week not found' }, { status: 404 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Discard any existing published week for this gym+week (prevents unique index conflict)
  await admin.from('workout_weeks')
    .update({ status: 'discarded' })
    .eq('gym_id', gymId).eq('week_start', draft.week_start).eq('status', 'published')

  // Now promote the draft to published
  const { data: published, error } = await admin.from('workout_weeks')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', weekId).eq('gym_id', gymId).eq('status', 'draft')
    .select('id').single()

  if (error || !published) return NextResponse.json({ error: 'Failed to publish week' }, { status: 500 })

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
