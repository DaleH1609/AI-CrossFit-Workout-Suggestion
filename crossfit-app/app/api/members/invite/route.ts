import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { userData } = auth
  const { email } = await req.json()

  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Supabase sends its own invite email with the magic link.
  const { data: inviteData, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/invite`
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Create user row
  await adminSupabase.from('users').insert({
    id: inviteData.user.id, gym_id: userData.gym_id, email, role: 'member'
  })

  return NextResponse.json({ success: true })
}
