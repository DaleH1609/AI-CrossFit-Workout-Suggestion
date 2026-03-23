import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Redirect unauthenticated users to login
  if (!user && !path.startsWith('/login') && !path.startsWith('/signup') && !path.startsWith('/invite')) {
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
    // Redirect root to role home
    if (path === '/') {
      return NextResponse.redirect(
        new URL(role === 'owner' ? '/dashboard' : '/this-week', request.url)
      )
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
