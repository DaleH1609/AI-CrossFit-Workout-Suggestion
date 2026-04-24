// lib/supabase/admin.ts
//
// Shared factory for the service-role admin client. Callers previously built
// this inline with non-null assertions on the env vars, which produces a
// confusing TypeError deep inside @supabase/supabase-js when something is
// misconfigured. This helper fails fast with a clear message instead.
//
// Use this ONLY on the server — anything running in the browser would leak the
// service-role key. Route handlers and cron endpoints are the intended callers.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(url, serviceKey)
}
