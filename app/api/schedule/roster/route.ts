export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

// GET /api/schedule/roster?instanceId=<uuid>
// Returns first names of confirmed attendees for a class instance.
// Gated by gym's show_member_names setting — returns count-only if disabled.
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase
    .from('users')
    .select('gym_id')
    .eq('id', user.id)
    .single()
  if (!userData) return jsonError('Unauthorized', 401)
  const gymId = (userData as unknown as { gym_id: string }).gym_id

  const { searchParams } = new URL(req.url)
  const instanceId = searchParams.get('instanceId')
  if (!instanceId) return jsonError('instanceId required', 400)

  try {
    const admin = createAdminClient()

    const [{ data: gymData }, { data: bookings }] = await Promise.all([
      admin.from('gyms').select('show_member_names').eq('id', gymId).single(),
      admin.from('bookings')
        .select('user_id, users(first_name)')
        .eq('instance_id', instanceId)
        .eq('gym_id', gymId)
        .eq('status', 'confirmed'),
    ])

    const showNames = (gymData as unknown as { show_member_names: boolean } | null)?.show_member_names ?? false
    const rows = (bookings ?? []) as { user_id: string; users: { first_name: string } | null }[]
    const others = rows.filter(r => r.user_id !== user.id)

    if (!showNames) {
      return jsonOk({ showNames: false, count: others.length })
    }

    const names = others
      .map(r => r.users?.first_name ?? null)
      .filter((n): n is string => !!n)

    return jsonOk({ showNames: true, count: others.length, names })
  } catch (err) {
    return jsonServerError('Failed to load roster', err)
  }
}
