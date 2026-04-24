// lib/auth-helpers.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

export interface OwnerAuthResult {
  supabase: ReturnType<typeof createClient>
  user: { id: string; email?: string }
  userData: { gym_id: string; role: string }
}

export interface MemberAuthResult {
  supabase: ReturnType<typeof createClient>
  user: { id: string; email?: string }
  userData: { gym_id: string; name: string; email: string }
}

/**
 * requireOwnerAuth — use in all owner-only API routes.
 * Returns { supabase, user, userData } or throws a NextResponse with 401/403.
 */
export async function requireOwnerAuth(): Promise<OwnerAuthResult | NextResponse> {
  const supabase = createClient()
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

  return { supabase, user: user as { id: string; email?: string }, userData: userData as { gym_id: string; role: string } }
}

/**
 * requireMemberAuth — use in member API routes.
 * Returns { supabase, user, userData } or throws a NextResponse with 401.
 */
export async function requireMemberAuth(): Promise<MemberAuthResult | NextResponse> {
  const supabase = createClient()
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
 * requireAdminAuth — use in admin Server Components, layouts, and Server Actions.
 * Reads ADMIN_EMAILS env var at call-time (fail-closed: blocks all if missing/empty).
 * Calls redirect('/login') if unauthorized — works in Server Components and Server Actions.
 * No DB query — identity lives entirely in the env var.
 */
export async function requireAdminAuth(): Promise<AdminAuthResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/login')
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (adminEmails.length === 0 || !adminEmails.includes(user.email)) redirect('/login')
  return { user: { id: user.id, email: user.email } }
}
