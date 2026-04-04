import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

export async function GET(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const url = new URL(req.url)
  const date = url.searchParams.get('date') // YYYY-MM-DD
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  // Fetch instances for this date and gym
  const { data: instances, error } = await supabase
    .from('class_instances')
    .select('id, starts_at, capacity, local_time')
    .eq('gym_id', userData.gym_id)
    .eq('date', date)
    .order('starts_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // For each instance, fetch confirmed bookings with user names
  type RawBooking = {
    id: string
    user_id: string
    attended: boolean | null
    users: { name: string } | null
  }

  const result = await Promise.all(
    (instances ?? []).map(async (instance) => {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, user_id, attended, users(name)')
        .eq('instance_id', instance.id)
        .eq('status', 'confirmed')
        .order('created_at')

      const typedBookings = (bookings ?? []) as unknown as RawBooking[]

      return {
        ...instance,
        bookings: typedBookings.map(b => ({
          id: b.id,
          user_id: b.user_id,
          attended: b.attended,
          name: b.users?.name ?? 'Unknown',
        })),
      }
    })
  )

  return NextResponse.json({ instances: result })
}
