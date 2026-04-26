// lib/supabase/admin.ts
//
// Shared factory for the service-role admin client. Callers previously built
// this inline with non-null assertions on the env vars, which produces a
// confusing TypeError deep inside @supabase/supabase-js when something is
// misconfigured. This helper fails fast with a clear message instead.
//
// Use this ONLY on the server — anything running in the browser would leak the
// service-role key. Route handlers and cron endpoints are the intended callers.

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Service-role Supabase client — bypasses RLS.
 * Only use in Server Components, Server Actions, and Route Handlers.
 * Never import in client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase admin environment variables')
  return createClient<Database>(url, serviceRoleKey)
}
