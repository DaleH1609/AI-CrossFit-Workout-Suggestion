import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { sendAccessRestored } from '@/lib/email/send'
import { z } from '@/lib/validation/z'
import { parseBody, jsonOk } from '@/lib/api/response'

const schema = z.object({ memberId: z.uuid() })

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth
  const parsed = await parseBody(req, schema)
  if (parsed instanceof NextResponse) return parsed
  const { memberId } = parsed

  const { data: member } = await supabase.from('users').select('email, name').eq('id', memberId).eq('gym_id', userData.gym_id).single()
  const { data: gym } = await supabase.from('gyms').select('name').eq('id', userData.gym_id).single()

  await supabase.from('users')
    .update({ revoked_at: null })
    .eq('id', memberId)
    .eq('gym_id', userData.gym_id)

  if (member && gym) {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`
    try {
      await sendAccessRestored(member.email, member.name, gym.name, loginUrl)
    } catch (err) {
      // Restoration must succeed even if the email fails
      console.error('[members/restore] email failed', { memberId, err })
    }
  }

  return jsonOk({ success: true })
}
