// app/api/members/referrals/route.ts
// GET  — member's own referrals
// POST — submit a referral email
import { createClient } from '@/lib/supabase/server'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data, error } = await supabase
    .from('referrals')
    .select('id, referred_email, status, created_at')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return jsonServerError('referrals GET', error)
  return jsonOk(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  if (!userData) return jsonError('User not found', 404)

  let body: { email?: unknown }
  try { body = await req.json() } catch { return jsonError('Invalid JSON') }

  const email = String(body.email ?? '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError('Valid email required')
  }

  const gymId = (userData as unknown as { gym_id: string }).gym_id

  // Check for duplicate
  const { data: existing } = await supabase.from('referrals')
    .select('id').eq('gym_id', gymId).eq('referred_email', email).maybeSingle()
  if (existing) return jsonError('This email has already been referred')

  const { data, error } = await supabase.from('referrals').insert({
    gym_id: gymId,
    referrer_id: user.id,
    referred_email: email,
  }).select().single()

  if (error) return jsonServerError('referrals POST', error)
  return jsonOk(data)
}
