export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCheckinCode } from '@/lib/checkin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

async function requireMember() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  if (!data) return null
  return { userId: user.id, gymId: data.gym_id as string }
}

// POST /api/members/checkin — member submits code to confirm attendance
export async function POST(req: Request) {
  const auth = await requireMember()
  if (!auth) return jsonError('Unauthorized', 401)

  const body = await req.json().catch(() => ({}))
  const { instanceId, code } = body as { instanceId?: string; code?: string }
  if (!instanceId || !code) return jsonError('instanceId and code are required')

  const trimmedCode = code.trim().replace(/\s/g, '')
  if (!/^\d{6}$/.test(trimmedCode)) return jsonError('Code must be 6 digits')

  if (!verifyCheckinCode(instanceId, trimmedCode)) {
    return jsonError('Invalid or expired code. Ask your coach for the current code.', 400)
  }

  const supabase = createAdminClient()

  try {
    // Verify the instance belongs to this gym
    const { data: instance } = await supabase
      .from('class_instances')
      .select('id, date, local_time, gym_id')
      .eq('id', instanceId)
      .eq('gym_id', auth.gymId)
      .single()

    if (!instance) return jsonError('Class not found', 404)

    // Find this member's booking for the class
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('instance_id', instanceId)
      .eq('user_id', auth.userId)
      .in('status', ['confirmed', 'pending_confirmation'])
      .maybeSingle()

    if (!booking) return jsonError('You don\'t have a confirmed booking for this class', 400)
    if (booking.status === 'attended') return jsonOk({ already: true, message: 'Already checked in!' })

    // Mark as attended
    await supabase
      .from('bookings')
      .update({ status: 'attended' })
      .eq('id', booking.id)

    return jsonOk({ success: true, message: 'Checked in successfully!' })
  } catch (err) {
    return jsonServerError('Check-in failed', err)
  }
}

// GET /api/members/checkin?instanceId=... — get the current code for a class (owner/coach only)
export async function GET(req: Request) {
  const auth = await requireMember()
  if (!auth) return jsonError('Unauthorized', 401)

  // Only owners/admins/coaches can retrieve the code directly
  // (Members see the code displayed at the gym, not via API)
  const { searchParams } = new URL(req.url)
  const instanceId = searchParams.get('instanceId')
  if (!instanceId) return jsonError('instanceId is required')

  const { generateCheckinCode } = await import('@/lib/checkin')

  try {
    const supabase = createAdminClient()
    const { data: userData } = await supabase
      .from('users')
      .select('role, gym_id')
      .eq('id', auth.userId)
      .single()

    const row = userData as { role: string; gym_id: string } | null
    if (!row || !['owner', 'admin', 'coach'].includes(row.role ?? '')) {
      return jsonError('Only coaches and owners can access the check-in code', 403)
    }

    const code = generateCheckinCode(instanceId)
    return jsonOk({ code, refreshesIn: 30 * 60 - (Math.floor(Date.now() / 1000) % (30 * 60)) })
  } catch (err) {
    return jsonServerError('Failed to get check-in code', err)
  }
}
