import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { memberId } = await req.json()

  await supabase.from('users')
    .update({ revoked_at: null })
    .eq('id', memberId)
    .eq('gym_id', userData.gym_id)

  return NextResponse.json({ success: true })
}
