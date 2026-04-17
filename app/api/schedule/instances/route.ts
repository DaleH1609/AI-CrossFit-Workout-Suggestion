import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

export async function GET(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const url = new URL(req.url)
  const date = url.searchParams.get('date') // YYYY-MM-DD
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  // Fetch instances for this date and gym
  const { data: instances, error } = await supabase
    .from('class_instances')
    .select('id, starts_at, capacity, local_time')
    .eq('gym_id', userData.gym_id)
    .eq('date', date)
    .order('starts_at')

  if (error) return NextResponse.json({ error: 'Failed to load instances' }, { status: 500 })
  if (!instances?.length) return NextResponse.json({ instances: [] })

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

  const result = instances.map(instance => ({
    ...instance,
    bookings: (bookingsByInstance.get(instance.id) ?? []).map(b => ({
      id: b.id,
      user_id: b.user_id,
      attended: b.attended,
      name: b.users?.name ?? 'Unknown',
    })),
  }))

  return NextResponse.json({ instances: result })
}
