import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { email, password, gymName, timezone } = await req.json()

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const userId = authData.user.id

  // 2. Create gym (no owner_id yet to avoid circular FK)
  const { data: gym, error: gymError } = await supabase
    .from('gyms').insert({ name: gymName, timezone }).select().single()
  if (gymError) return NextResponse.json({ error: gymError.message }, { status: 400 })

  // 3. Create user row
  const { error: userError } = await supabase.from('users').insert({
    id: userId, gym_id: gym.id, email, role: 'owner'
  })
  if (userError) return NextResponse.json({ error: userError.message }, { status: 400 })

  // 4. Set owner_id on gym
  await supabase.from('gyms').update({ owner_id: userId }).eq('id', gym.id)

  return NextResponse.json({ success: true })
}
