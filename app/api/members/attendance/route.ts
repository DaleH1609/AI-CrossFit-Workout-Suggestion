import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonServerError } from '@/lib/api/response'

function monthStartUTC(year: number, month: number, tz: string): string {
  // Use sv-SE locale trick: format a reference date (2nd of month, noon UTC) in the target TZ
  // This gives us "YYYY-MM-DD HH:mm:ss" in local time — parse it as UTC to get the offset
  const ref = new Date(Date.UTC(year, month - 1, 2, 12, 0, 0))
  const localStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(ref)
  // localStr looks like "2024-03-02 12:00:00" — parse as UTC to get actual local time
  const localMs = new Date(localStr.replace(' ', 'T') + 'Z').getTime()
  // offset = localMs - refMs (positive = ahead of UTC, negative = behind)
  const offsetMs = localMs - ref.getTime()
  // local midnight of the 1st = UTC midnight of the 1st minus the offset
  return new Date(Date.UTC(year, month - 1, 1) - offsetMs).toISOString()
}

export async function GET() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth

  // 1. Fetch gym timezone
  const { data: gymData, error: gymError } = await supabase
    .from('gyms')
    .select('timezone')
    .eq('id', userData.gym_id)
    .single()

  if (gymError) {
    return jsonServerError('members/attendance gyms', gymError)
  }

  const tz = gymData?.timezone ?? 'UTC'

  // 2. Compute month boundaries in the gym's local timezone
  const now = new Date()

  // Get current year/month in gym's local timezone
  const nowInGymTz = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
  }).format(now)
  // nowInGymTz looks like "2024-03"
  const [year, month] = nowInGymTz.split('-').map(Number)

  const monthStart = monthStartUTC(year, month, tz)

  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const monthEnd = monthStartUTC(nextYear, nextMonth, tz)

  // 3. Query bookings joined with class_instances for current month
  const { data: rows, error: bookingsError } = await supabase
    .from('bookings')
    .select('user_id, class_instances!inner(starts_at)')
    .eq('gym_id', userData.gym_id)
    .eq('attended', true)
    .gte('class_instances.starts_at', monthStart)
    .lt('class_instances.starts_at', monthEnd)

  if (bookingsError) {
    return jsonServerError('members/attendance bookings', bookingsError)
  }

  // 4. Fetch active members (role = 'member', revoked_at IS NULL)
  const { data: activeMembers, error: membersError } = await supabase
    .from('users')
    .select('id')
    .eq('gym_id', userData.gym_id)
    .eq('role', 'member')
    .is('revoked_at', null)

  if (membersError) {
    return jsonServerError('members/attendance members', membersError)
  }

  const activeMemberSet = new Set<string>(
    (activeMembers ?? []).map((m: { id: string }) => m.id)
  )

  // 5. Build attendance map — only include active members
  const attendance: Record<string, number> = {}

  for (const row of rows ?? []) {
    const userId = (row as { user_id: string }).user_id
    if (!activeMemberSet.has(userId)) continue
    attendance[userId] = (attendance[userId] ?? 0) + 1
  }

  // 6. Return the map
  return jsonOk({ attendance })
}
