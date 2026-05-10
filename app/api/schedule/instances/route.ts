import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export async function GET(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const url = new URL(req.url)
  const date = url.searchParams.get('date') // YYYY-MM-DD
  if (!date) return jsonError('date required')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return jsonError('date must be YYYY-MM-DD')
  }

  // Fetch instances for this date and gym
  const { data: instances, error } = await supabase
    .from('class_instances')
    .select('id, starts_at, capacity, local_time, name, coach_id')
    .eq('gym_id', userData.gym_id)
    .eq('date', date)
    .order('starts_at')

  if (error) return jsonServerError('schedule/instances GET', error)
  if (!instances?.length) return jsonOk({ instances: [] })

  // Fetch all bookings for these instances in one query (avoid N+1)
  const instanceIds = instances.map(i => i.id)

  type RawBooking = {
    id: string
    instance_id: string
    user_id: string
    attended: boolean | null
    users: { name: string } | null
  }

  const { data: allBookings } = await supabase
    .from('bookings')
    .select('id, instance_id, user_id, attended, users(name)')
    .in('instance_id', instanceIds)
    .eq('status', 'confirmed')
    .order('created_at')

  const typedBookings = (allBookings ?? []) as unknown as RawBooking[]
  const bookingsByInstance = new Map<string, RawBooking[]>()
  for (const b of typedBookings) {
    const list = bookingsByInstance.get(b.instance_id) ?? []
    list.push(b)
    bookingsByInstance.set(b.instance_id, list)
  }

  type RawInstance = { id: string; starts_at: string; capacity: number; local_time: string; name: string | null; coach_id: string | null }

  // Resolve coach names in one query
  const coachIds = [...new Set((instances as unknown as RawInstance[]).map(i => i.coach_id).filter(Boolean) as string[])]
  const coachMap = new Map<string, string>()
  if (coachIds.length > 0) {
    const { data: coaches } = await supabase.from('users').select('id, name').in('id', coachIds)
    for (const c of coaches ?? []) coachMap.set((c as { id: string; name: string }).id, (c as { id: string; name: string }).name)
  }

  const result = (instances as unknown as RawInstance[]).map(instance => ({
    ...instance,
    coachName: instance.coach_id ? (coachMap.get(instance.coach_id) ?? null) : null,
    bookings: (bookingsByInstance.get(instance.id) ?? []).map(b => ({
      id: b.id,
      user_id: b.user_id,
      attended: b.attended,
      name: b.users?.name ?? 'Unknown',
    })),
  }))

  return jsonOk({ instances: result })
}
