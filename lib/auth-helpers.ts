// lib/auth-helpers.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { jsonServerError } from '@/lib/api/response'

export interface OwnerAuthResult {
  supabase: SupabaseClient<Database>
  user: { id: string; email?: string }
  userData: { gym_id: string; role: string }
}

export interface MemberAuthResult {
  supabase: SupabaseClient<Database>
  user: { id: string; email?: string }
  userData: { gym_id: string; name: string; email: string }
}

/**
 * requireOwnerAuth — use in all owner-only API routes.
 * Returns { supabase, user, userData } or throws a NextResponse with 401/403.
 */
export async function requireOwnerAuth(): Promise<OwnerAuthResult | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('gym_id, role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // MFA enforcement disabled for testing — re-enable before launch.
  // const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  // if (aal?.currentLevel !== 'aal2') {
  //   return NextResponse.json({ error: 'MFA required', code: 'MFA_REQUIRED' }, { status: 403 })
  // }

  // Suspension check — blocks owner from all API mutations. Members are NOT affected.
  const { data: gymData, error: gymError } = await supabase
    .from('gyms')
    .select('suspended_at')
    .eq('id', userData.gym_id)
    .single()

  if (gymError || !gymData) {
    return jsonServerError('requireOwnerAuth gym lookup', gymError)
  }

  if (gymData.suspended_at) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  return { supabase, user: user as { id: string; email?: string }, userData: userData as { gym_id: string; role: string } }
}

/**
 * requireMemberAuth — use in member API routes.
 * Returns { supabase, user, userData } or throws a NextResponse with 401.
 */
export async function requireMemberAuth(): Promise<MemberAuthResult | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('gym_id, name, email, revoked_at')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const u = userData as { gym_id: string; name: string; email: string; revoked_at: string | null }
  if (u.revoked_at) return NextResponse.json({ error: 'Account access has been revoked' }, { status: 403 })

  // Members get a 7-day grace period after their gym is suspended — they keep
  // access while the owner resolves billing, but not indefinitely.
  const { data: gymData } = await supabase
    .from('gyms')
    .select('suspended_at')
    .eq('id', u.gym_id)
    .single()

  const GRACE_MS = 7 * 24 * 60 * 60 * 1000
  if (gymData?.suspended_at && Date.now() - new Date(gymData.suspended_at).getTime() > GRACE_MS) {
    return NextResponse.json({ error: 'Gym account suspended' }, { status: 403 })
  }

  return { supabase, user: user as { id: string; email?: string }, userData: u }
}

/** Type guard: narrows the union return of requireOwnerAuth / requireMemberAuth to the success shape. */
export function isNextResponse(val: unknown): val is NextResponse {
  return val instanceof NextResponse
}

export interface AdminAuthResult {
  user: { id: string; email: string }
}

/**
 * Pure helper — exported so tests can import the real implementation.
 * Parses the ADMIN_EMAILS env-var value (comma-separated, lowercased, trimmed).
 * Returns false (fail-closed) when the list is empty or the email is absent.
 */
export function isAdminEmail(email: string, envValue: string | undefined = process.env.ADMIN_EMAILS): boolean {
  const list = (envValue ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return list.length > 0 && list.includes(email.toLowerCase())
}

/**
 * requireAdminAuth — use in admin Server Components, layouts, and Server Actions.
 * Reads ADMIN_EMAILS env var at call-time (fail-closed: blocks all if missing/empty).
 * Calls redirect('/login') if unauthorized — works in Server Components and Server Actions.
 * No DB query — identity lives entirely in the env var.
 * MFA (aal2) is required for all admin routes.
 */
export async function requireAdminAuth(): Promise<AdminAuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/login')

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
    redirect('/mfa/verify')
  }
  if (aal?.currentLevel !== 'aal2') {
    redirect('/mfa/enroll')
  }

  return { user: { id: user.id, email: user.email } }
}

/**
 * requireOwnerServerAuth — use in Server Component layouts for (owner) routes.
 * Defence-in-depth: verifies session + owner role + MFA (aal2) + not suspended.
 * Uses redirect() from next/navigation (works in Server Components/layouts).
 */
export async function requireOwnerServerAuth(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('gym_id, role')
    .eq('id', user.id)
    .single()

  if (userError) {
    console.error('[requireOwnerServerAuth] users query failed for', user.id, userError)
    redirect('/login')
  }

  if (userData?.role !== 'owner') redirect('/login')

  // MFA enforcement disabled for testing — re-enable before launch.
  // const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  // if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
  //   redirect('/mfa/verify')
  // }
  // if (aal?.currentLevel !== 'aal2') {
  //   redirect('/mfa/enroll')
  // }

  const { data: gymData } = await supabase
    .from('gyms')
    .select('suspended_at')
    .eq('id', userData.gym_id)
    .single()

  if (gymData?.suspended_at) redirect('/suspended')
}

/**
 * requireMemberServerAuth — use in Server Component layouts for (member) routes.
 * Defence-in-depth: verifies session + member exists + not revoked.
 * Uses redirect() from next/navigation (works in Server Components/layouts).
 */
export async function requireMemberServerAuth(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('gym_id, revoked_at')
    .eq('id', user.id)
    .single()

  if (userError) {
    console.error('[requireMemberServerAuth] users query failed for', user.id, userError)
    redirect('/login')
  }

  if (!userData) redirect('/login')
  if ((userData as { revoked_at: string | null }).revoked_at) redirect('/login')

  // Members get a 7-day grace period after their gym is suspended.
  const { data: gymData } = await supabase
    .from('gyms')
    .select('suspended_at')
    .eq('id', (userData as { gym_id: string }).gym_id)
    .single()

  const GRACE_MS = 7 * 24 * 60 * 60 * 1000
  if (gymData?.suspended_at && Date.now() - new Date(gymData.suspended_at).getTime() > GRACE_MS) {
    redirect('/suspended')
  }
}

export interface MessagingAuthResult {
  supabase: SupabaseClient<Database>
  user: { id: string; email?: string }
  userData: { gym_id: string; role: string; revoked_at: string | null }
}

/**
 * requireMessagingAuth — use in dual-role messaging routes (member + owner).
 * Returns { supabase, user, userData } or a NextResponse with 401/403.
 * Does not check gym suspension — intentional: messaging is allowed during suspension
 * so members and owners can communicate during billing disputes.
 */
export async function requireMessagingAuth(): Promise<MessagingAuthResult | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('gym_id, role, revoked_at')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (userData.revoked_at) return NextResponse.json({ error: 'Revoked' }, { status: 403 })

  return {
    supabase,
    user: user as { id: string; email?: string },
    userData: userData as { gym_id: string; role: string; revoked_at: string | null },
  }
}
