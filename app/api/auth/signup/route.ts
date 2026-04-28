import { createAdminClient } from '@/lib/supabase/admin'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'
import { rateLimit } from '@/lib/rate-limit'

function getClientIp(req: Request): string {
  // x-real-ip is set by Vercel and cannot be spoofed
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp

  // Last IP in X-Forwarded-For is appended by Vercel's CDN (not client-controlled)
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const ips = forwarded.split(',').map(s => s.trim()).filter(Boolean)
    if (ips.length > 0) return ips[ips.length - 1]
  }

  return 'unknown'
}

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const { limited } = await rateLimit(ip, 'signup')
  if (limited) return jsonError('Too many requests. Please try again later.', 429)

  const supabase = createAdminClient()
  let body: { email?: unknown; password?: unknown; gymName?: unknown; timezone?: unknown; gymType?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body')
  }
  const { email, password, gymName, timezone, gymType } = body as {
    email?: string; password?: string; gymName?: string; timezone?: string; gymType?: string
  }

  // Input validation
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return jsonError('Invalid email address')
  }
  const trimmedGymName = typeof gymName === 'string' ? gymName.trim() : ''
  if (trimmedGymName.length < 2 || trimmedGymName.length > 50) {
    return jsonError('Gym name must be between 2 and 50 characters')
  }
  if (!password || password.length < 8) {
    return jsonError('Password must be at least 8 characters')
  }
  if (gymType !== 'crossfit' && gymType !== 'hyrox') {
    return jsonError('Gym type must be crossfit or hyrox')
  }

  // Validate timezone is a real IANA identifier
  if (!timezone || typeof timezone !== 'string' || timezone.length > 50) {
    return jsonError('Invalid timezone')
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
  } catch {
    return jsonError('Invalid timezone')
  }

  const resolvedGymType = gymType === 'hyrox' ? 'hyrox' : 'crossfit'

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true
  })
  // Don't leak Supabase error details (e.g. "email already in use") to avoid enumeration
  if (authError) return jsonError('Unable to create account. Check your details and try again.')

  const userId = authData.user.id

  // 2. Create gym (no owner_id yet to avoid circular FK)
  const { data: gym, error: gymError } = await supabase
    .from('gyms').insert({ name: trimmedGymName, timezone, gym_type: resolvedGymType }).select().single()
  if (gymError) return jsonServerError('auth/signup gyms.insert', gymError)

  // 3. Create user row
  const { error: userError } = await supabase.from('users').insert({
    id: userId, gym_id: gym.id, email, role: 'owner'
  })
  if (userError) return jsonServerError('auth/signup users.insert', userError)

  // 4. Set owner_id on gym
  await supabase.from('gyms').update({ owner_id: userId }).eq('id', gym.id)

  return jsonOk({ success: true })
}
