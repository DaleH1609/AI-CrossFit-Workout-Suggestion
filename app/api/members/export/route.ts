// app/api/members/export/route.ts
// GET — export all of the authenticated member's own data as JSON (GDPR Art. 15 right of access)
import { createClient } from '@/lib/supabase/server'
import { jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  // Fetch everything in parallel; ignore errors on optional tables
  const [
    profileRes,
    bookingsRes,
    scoresRes,
    measurementsRes,
    goalsRes,
    badgesRes,
    skillsRes,
    feedbackRes,
  ] = await Promise.all([
    supabase.from('users')
      .select('id, name, email, role, created_at')
      .eq('id', user.id).single(),

    supabase.from('bookings')
      .select('id, status, attended, created_at, class_instances(date, local_time, class_slot_templates(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase.from('workout_scores')
      .select('id, score_type, score_value, score_text, rx, notes, workout_date, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase.from('measurements')
      .select('id, measured_at, weight_kg, body_fat_pct, muscle_mass_kg, chest_cm, waist_cm, hips_cm, notes')
      .eq('user_id', user.id)
      .order('measured_at', { ascending: false }),

    supabase.from('personal_goals')
      .select('id, title, target, achieved, achieved_at, due_date, created_at')
      .eq('user_id', user.id),

    supabase.from('member_badges')
      .select('id, earned_at, badge_definitions(slug, name)')
      .eq('user_id', user.id),

    supabase.from('member_skills')
      .select('id, level, notes, updated_at, skills(name, category)')
      .eq('user_id', user.id),

    supabase.from('class_feedback')
      .select('id, rating, comment, created_at, class_instances(date, local_time, class_slot_templates(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  if (profileRes.error) return jsonServerError('members/export GET', profileRes.error)

  const payload = {
    exported_at: new Date().toISOString(),
    profile: profileRes.data,
    bookings: bookingsRes.data ?? [],
    workout_scores: scoresRes.data ?? [],
    measurements: measurementsRes.data ?? [],
    personal_goals: goalsRes.data ?? [],
    badges: badgesRes.data ?? [],
    skills: skillsRes.data ?? [],
    class_feedback: feedbackRes.data ?? [],
  }

  const json = JSON.stringify(payload, null, 2)
  const filename = `kova-data-export-${new Date().toISOString().slice(0, 10)}.json`

  return new Response(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
