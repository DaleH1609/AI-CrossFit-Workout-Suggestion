import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { userData } = auth
  const body = await req.json().catch(() => null)
  const rawEmail = body?.email

  if (typeof rawEmail !== 'string' || !EMAIL_RE.test(rawEmail.trim())) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }

  // Normalize to lowercase so 'John@x.com' and 'john@x.com' are the same member.
  // Supabase Auth treats emails case-insensitively internally; our `users` table
  // has a case-sensitive unique(gym_id, email) index — so normalizing at the
  // app boundary prevents the "two accounts, one inbox" duplicate.
  const email = rawEmail.trim().toLowerCase()

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Guard: if this email is already a member of a DIFFERENT gym, an upsert on
  // id would silently overwrite their gym_id, moving them between gyms. Refuse.
  const { data: existingByEmail } = await adminSupabase
    .from('users')
    .select('id, gym_id, revoked_at')
    .eq('email', email)
    .maybeSingle()

  if (existingByEmail && existingByEmail.gym_id !== userData.gym_id) {
    return NextResponse.json(
      { error: 'This email is already registered at another gym' },
      { status: 409 }
    )
  }

  // Supabase sends its own invite email with the magic link.
  const { data: inviteData, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL?.trim()}/invite`,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Create user row (upsert in case they were previously deleted from users but
  // Auth account persists). Re-assert gym_id here so a rejoin clears any prior
  // revocation and keeps the member on this gym.
  const { error: insertError } = await adminSupabase.from('users').upsert(
    { id: inviteData.user.id, gym_id: userData.gym_id, email, role: 'member' },
    { onConflict: 'id' }
  )

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
