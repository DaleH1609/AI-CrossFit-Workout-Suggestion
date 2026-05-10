import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { isAdminEmail } from '@/lib/auth-helpers'

export async function proxy(request: NextRequest) {
  // Generate a per-request nonce for CSP. Set it on the forwarded request
  // headers so Next.js applies it to its own inline hydration scripts (via the
  // x-nonce convention) and so the root layout can read it for any custom
  // <Script> components.
  const nonce = randomBytes(16).toString('base64')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  let response = NextResponse.next({ request: { headers: requestHeaders } })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // ── Admin branch — checked before all other routing ──────────────────────
  // /admin/* requires valid session + email in ADMIN_EMAILS (fail-closed)
  if (path.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    if (!user.email || !isAdminEmail(user.email)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response // admin verified — skip role-based routing below
  }

  // ── General unauthenticated redirect ─────────────────────────────────────
  // /suspended is public (owner may not be able to complete auth while suspended)
  if (
    !user &&
    path !== '/' &&
    !path.startsWith('/login') &&
    !path.startsWith('/signup') &&
    !path.startsWith('/invite') &&
    !path.startsWith('/auth/callback') &&
    path !== '/suspended' &&
    path !== '/privacy' &&
    path !== '/terms' &&
    !path.startsWith('/whiteboard') &&
    !path.startsWith('/gyms')
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = userData?.role

    // Route by role
    if (role === 'owner' && path.startsWith('/this-week')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (role === 'member' && path.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/this-week', request.url))
    }
    // Coaches go to their dashboard; block owner/member-only routes
    if (role === 'coach' && path === '/') {
      return NextResponse.redirect(new URL('/coach-dashboard', request.url))
    }
    if (role === 'coach' && (path.startsWith('/dashboard') || path.startsWith('/this-week'))) {
      return NextResponse.redirect(new URL('/coach-dashboard', request.url))
    }
    // Redirect root to role home.
    // Default to /dashboard when role is unknown (DB query failed) so that
    // unauthenticated-loop doesn't bounce owner→/this-week→member-layout→/login.
    if (path === '/') {
      return NextResponse.redirect(
        new URL(role === 'member' ? '/this-week' : '/dashboard', request.url)
      )
    }
  }

  const isDev = process.env.NODE_ENV === 'development'
  const csp = [
    "default-src 'self'",
    // unsafe-inline kept for styles — no XSS risk without script injection.
    "style-src 'self' 'unsafe-inline'",
    // unsafe-inline removed — nonce replaces it for all inline scripts.
    // unsafe-eval removed in production; kept in dev for Next.js HMR / eval().
    `script-src 'self' 'nonce-${nonce}' blob:${isDev ? " 'unsafe-eval'" : ''}`,
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "img-src 'self' data:",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ].join('; ')
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  // HSTS is set globally in next.config.mjs so it covers API routes too.
  // Removed from here to avoid duplication — next.config.mjs wins for all routes.

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
