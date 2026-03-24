import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
