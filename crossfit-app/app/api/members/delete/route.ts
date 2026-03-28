import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

interface BookingWithInstance { id: string; class_instances: { starts_at: string } }

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { memberId } = await req.json()
  const now = new Date().toISOString()

  // Verify member belongs to this gym
  const { data: member } = await supabase.from('users')
    .select('id').eq('id', memberId).eq('gym_id', userData.gym_id).single()
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  // Cancel all future bookings
  const { data: rawBookings } = await supabase.from('bookings')
    .select('id, class_instances(starts_at)')
    .eq('user_id', memberId)
    .in('status', ['confirmed', 'waitlisted', 'pending_confirmation'])
    .returns<BookingWithInstance[]>()

  const futureBookingIds = (rawBookings ?? [])
    .filter(b => new Date(b.class_instances.starts_at) > new Date())
    .map(b => b.id)

  if (futureBookingIds.length > 0) {
    await supabase.from('bookings')
      .update({ status: 'cancelled', cancelled_at: now })
      .in('id', futureBookingIds)
  }

  // Delete user row
  await supabase.from('users').delete().eq('id', memberId).eq('gym_id', userData.gym_id)

  // Delete from Supabase Auth
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  await adminSupabase.auth.admin.deleteUser(memberId)

  return NextResponse.json({ success: true })
}
