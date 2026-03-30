import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { attended } = await req.json()

  if (attended !== true && attended !== false && attended !== null) {
    return NextResponse.json({ error: 'attended must be true, false, or null' }, { status: 400 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, gym_id, status')
    .eq('id', params.id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.gym_id !== userData.gym_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: 'Can only mark attendance on confirmed bookings' }, { status: 400 })
  }

  await supabase.from('bookings').update({ attended }).eq('id', params.id)

  return NextResponse.json({ success: true })
}
