import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { sendAccessRestored } from '@/lib/email/send'

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const { memberId } = await req.json()

  const { data: member } = await supabase.from('users').select('email, name').eq('id', memberId).single()
  const { data: gym } = await supabase.from('gyms').select('name').eq('id', userData.gym_id).single()

  await supabase.from('users')
    .update({ revoked_at: null })
    .eq('id', memberId)
    .eq('gym_id', userData.gym_id)

  if (member && gym) {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`
    await sendAccessRestored(member.email, member.name, gym.name, loginUrl)
  }

  return NextResponse.json({ success: true })
}
