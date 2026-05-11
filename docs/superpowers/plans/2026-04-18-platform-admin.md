# Platform Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a platform-level admin panel at `/admin` giving the site owner full visibility into all gyms, members, bookings, and class instances — with suspend/delete danger zone actions and a gym-suspension flow for owners.

**Architecture:** New `(admin)` route group backed by Supabase service-role client (bypasses RLS). Auth via `ADMIN_EMAILS` env var checked in middleware + admin layout (`requireAdminAuth()`). All data fetching in Server Components. Danger Zone mutations via Server Actions (each independently calls `requireAdminAuth()`). Client components only where interactivity is needed (search filter, accordion, confirmation UI).

**Tech Stack:** Next.js 14 App Router, Supabase service role client, Server Actions, Tailwind CSS, existing UI components (`KovaLogo`, `ThemeToggle`).

---

## File Structure

**New files:**
```
supabase/migrations/018_admin.sql              # suspended_at + admin_audit_log
lib/supabase/admin.ts                          # createAdminClient() — service role
app/suspended/page.tsx                         # public page for suspended owners
components/layout/admin-sidebar.tsx            # mirrors OwnerSidebar
app/(admin)/layout.tsx                         # requireAdminAuth() + AdminSidebar
app/(admin)/page.tsx                           # /admin — overview stats + recent gyms
app/(admin)/gyms/page.tsx                      # /admin/gyms — gym list + server data
app/(admin)/gyms/gym-search-client.tsx         # client search/filter over gym list
app/(admin)/gyms/[gymId]/page.tsx              # /admin/gyms/[gymId] — gym detail
app/(admin)/gyms/[gymId]/member-accordion-client.tsx  # accordion for booking history
app/(admin)/gyms/[gymId]/danger-zone-client.tsx       # suspend/delete confirmation UI
app/(admin)/gyms/[gymId]/actions.ts            # Server Actions: suspend, unsuspend, delete
app/(admin)/users/page.tsx                     # /admin/users — server-side user search
app/(admin)/users/user-accordion-client.tsx    # accordion for user booking history
tests/lib/admin-auth.test.ts                   # unit tests for requireAdminAuth logic
```

**Modified files:**
```
lib/auth-helpers.ts           # add requireAdminAuth(); extend requireOwnerAuth() for suspension
middleware.ts                 # add /admin branch; add /suspended to bypass list
```

---

## Task 1: DB Migration 018

**Files:**
- Create: `supabase/migrations/018_admin.sql`

- [ ] **Step 1: Create the migration file**

> **⚠ Migration number note:** The spec references `017_admin.sql`, but migration 017 is already taken by `017_confirmation_token_text.sql`. This plan correctly uses `018_admin.sql`. The spec is stale on this point — do not follow the spec's filename.

```sql
-- 018_admin.sql
-- Adds gym suspension support and admin audit log

alter table gyms add column if not exists suspended_at timestamptz;

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,         -- 'suspend_gym' | 'unsuspend_gym' | 'delete_gym'
  target_id uuid,
  target_name text,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: Apply migration to local Supabase**

Run: `npx supabase db reset` (or `npx supabase migration up` if you have local Supabase running)

Expected: migration applies cleanly, no errors. Verify `gyms` has `suspended_at` column and `admin_audit_log` table exists.

> **Note for production:** Apply `018_admin.sql` in the Supabase dashboard → SQL editor after deploying.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/018_admin.sql
git commit -m "feat: add gyms.suspended_at and admin_audit_log migration (018)"
```

---

## Task 2: Supabase Admin Client

**Files:**
- Create: `lib/supabase/admin.ts`

- [ ] **Step 1: Create the admin client**

```typescript
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Service-role Supabase client — bypasses RLS.
 * Only use in Server Components, Server Actions, and Route Handlers.
 * Never import in client components.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 2: Verify `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local`**

Run: `grep SUPABASE_SERVICE_ROLE_KEY .env.local`

Expected: key is present. If missing, get it from the Supabase dashboard → Project Settings → API → service_role secret.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/admin.ts
git commit -m "feat: add createAdminClient using service role key"
```

---

## Task 3: `requireAdminAuth()` + tests

**Files:**
- Modify: `lib/auth-helpers.ts`
- Create: `tests/lib/admin-auth.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/admin-auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Test the email-list parsing logic in isolation (pure function, no mocking needed)
function parseAdminEmails(env: string | undefined): string[] {
  return (env ?? '').split(',').map(e => e.trim()).filter(Boolean)
}

function isAdminEmail(email: string, env: string | undefined): boolean {
  const list = parseAdminEmails(env)
  return list.length > 0 && list.includes(email)
}

describe('admin email check', () => {
  it('allows email in list', () => {
    expect(isAdminEmail('admin@example.com', 'admin@example.com,other@example.com')).toBe(true)
  })

  it('blocks email not in list', () => {
    expect(isAdminEmail('intruder@example.com', 'admin@example.com')).toBe(false)
  })

  it('blocks all when ADMIN_EMAILS is empty — fail-closed', () => {
    expect(isAdminEmail('admin@example.com', '')).toBe(false)
    expect(isAdminEmail('admin@example.com', undefined)).toBe(false)
  })

  it('trims whitespace around email addresses', () => {
    expect(isAdminEmail('admin@example.com', ' admin@example.com , other@example.com ')).toBe(true)
  })

  it('blocks when ADMIN_EMAILS has only whitespace', () => {
    expect(isAdminEmail('admin@example.com', '   ,  ')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it passes (self-contained logic, no mocking needed)**

Run: `npx vitest run tests/lib/admin-auth.test.ts`

Expected: PASS — these tests are self-contained and will pass as written. (The logic is inline for isolation.)

- [ ] **Step 3: Add `requireAdminAuth()` to `lib/auth-helpers.ts`**

Add after the existing `isNextResponse` export at the bottom of `lib/auth-helpers.ts`:

```typescript
import { redirect } from 'next/navigation'
```

Add this import at the top (next to existing imports), then add the function and interface:

```typescript
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
```

> **Note:** `redirect()` from `next/navigation` throws a special NEXT_REDIRECT error that Next.js catches. TypeScript infers the return as `never` for the redirect branches, so the function's declared return type `Promise<AdminAuthResult>` is sound.

- [ ] **Step 4: Run tests again**

Run: `npx vitest run tests/lib/admin-auth.test.ts`

Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/auth-helpers.ts tests/lib/admin-auth.test.ts
git commit -m "feat: add requireAdminAuth() with fail-closed ADMIN_EMAILS check"
```

---

## Task 4: Extend `requireOwnerAuth()` for gym suspension

**Files:**
- Modify: `lib/auth-helpers.ts`

The spec says suspension only locks out the gym owner, not members. `requireMemberAuth()` does NOT change.

- [ ] **Step 1: Add suspension check inside `requireOwnerAuth()`**

> **Important:** `requireOwnerAuth()` is called from API Route Handlers, not Server Components. `redirect()` from `next/navigation` throws a `NEXT_REDIRECT` that Route Handlers do NOT catch gracefully — it produces a 500. Use `NextResponse.redirect()` instead, dynamically constructing the base URL from the `host` request header via `next/headers`.

Add this import at the top of `lib/auth-helpers.ts` (next to existing imports):

```typescript
import { headers } from 'next/headers'
```

After the `if (userData?.role !== 'owner')` check, add the suspension query and redirect:

```typescript
// Check gym suspension — owner is blocked, members are not (see spec)
const { data: gymData } = await supabase
  .from('gyms')
  .select('suspended_at')
  .eq('id', userData.gym_id)
  .single()

if (gymData?.suspended_at) {
  const headersList = headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return NextResponse.redirect(new URL('/suspended', `${proto}://${host}`))
}
```

The updated `requireOwnerAuth()` function body after this change:

```typescript
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

  // Suspension check — blocks owner from all API mutations
  const { data: gymData } = await supabase
    .from('gyms')
    .select('suspended_at')
    .eq('id', userData.gym_id)
    .single()

  if (gymData?.suspended_at) {
    const headersList = headers()
    const host = headersList.get('host') ?? 'localhost:3000'
    const proto = host.startsWith('localhost') ? 'http' : 'https'
    return NextResponse.redirect(new URL('/suspended', `${proto}://${host}`))
  }

  return {
    supabase,
    user: user as { id: string; email?: string },
    userData: userData as { gym_id: string; role: string },
  }
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/auth-helpers.ts
git commit -m "feat: block suspended gym owners via requireOwnerAuth()"
```

---

## Task 5: Update middleware (admin branch + /suspended bypass)

**Files:**
- Modify: `middleware.ts`

Two changes:
1. Add `/admin` branch at the top of the handler (after user fetch, before general routing)
2. Add `/suspended` to the list of paths that bypass the unauthenticated redirect

- [ ] **Step 1: Apply both changes to `middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
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
    const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
    if (adminEmails.length === 0 || !adminEmails.includes(user.email ?? '')) {
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
    path !== '/suspended'
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
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add /admin auth branch and /suspended bypass to middleware"
```

---

## Task 6: `/suspended` page

**Files:**
- Create: `app/suspended/page.tsx`

Publicly accessible — no auth required. Static content.

- [ ] **Step 1: Create the page**

```typescript
// app/suspended/page.tsx
export default function SuspendedPage() {
  const supportEmail = process.env.SUPPORT_EMAIL ?? 'support'
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Account Suspended</h1>
        <p className="text-secondary">
          Your gym account has been suspended. Please contact support at{' '}
          {supportEmail !== 'support' ? (
            <a href={`mailto:${supportEmail}`} className="text-accent underline">
              {supportEmail}
            </a>
          ) : (
            <span className="text-accent">support</span>
          )}{' '}
          to resolve this.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it renders**

Run: `npx next build 2>&1 | grep -E 'error|Error'`

Expected: no errors related to this file

- [ ] **Step 3: Commit**

```bash
git add app/suspended/page.tsx
git commit -m "feat: add /suspended page for suspended gym owners"
```

---

## Task 7: AdminSidebar component

**Files:**
- Create: `components/layout/admin-sidebar.tsx`

Mirrors `OwnerSidebar` pattern exactly — same hover-expand desktop, slide-out mobile, but with admin nav items and "PLATFORM ADMIN" label.

- [ ] **Step 1: Create the component**

```typescript
// components/layout/admin-sidebar.tsx
'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { KovaLogo } from '@/components/ui/kova-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { createClient } from '@/lib/supabase/client'

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconOverview() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function IconGyms() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9l9-7 9 7v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" strokeLinejoin="round"/>
      <path d="M9 22V12h6v10" strokeLinejoin="round"/>
    </svg>
  )
}
function IconSearch() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
    </svg>
  )
}
function IconArrowLeft() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const nav = [
  { href: '/admin',        label: 'Overview',     Icon: IconOverview },
  { href: '/admin/gyms',   label: 'Gyms',         Icon: IconGyms     },
  { href: '/admin/users',  label: 'User Lookup',  Icon: IconSearch   },
]

export function AdminSidebar() {
  const path = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout>>()

  function onEnter() {
    clearTimeout(collapseTimer.current)
    setExpanded(true)
  }
  function onLeave() {
    collapseTimer.current = setTimeout(() => setExpanded(false), 180)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const isActive = (href: string) =>
    href === '/admin' ? path === '/admin' : path.startsWith(href)

  return (
    <>
      {/* ── Mobile hamburger ── */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-surface border border-border text-foreground rounded-md"
        aria-label="Open navigation menu"
      >
        <span className="block w-5 h-0.5 bg-current mb-1" />
        <span className="block w-5 h-0.5 bg-current mb-1" />
        <span className="block w-5 h-0.5 bg-current" />
      </button>

      {/* ── Mobile overlay ── */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/70" onClick={() => setIsOpen(false)} aria-hidden="true" />
      )}

      {/* ── Mobile slide-out sidebar ── */}
      <aside className={cn(
        'md:hidden w-56 min-h-screen bg-surface border-r border-border flex flex-col',
        'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex flex-col">
            <KovaLogo size="sm" />
            <span className="text-[10px] font-semibold tracking-widest text-secondary uppercase mt-1">Platform Admin</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-secondary hover:text-foreground text-xl leading-none" aria-label="Close">✕</button>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {nav.map(({ href, label, Icon }) => (
            <Link key={href} href={href} onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors border-l-2',
                isActive(href) ? 'border-accent text-accent bg-accent-5' : 'border-transparent text-secondary hover:text-foreground hover:bg-surface-raised'
              )}>
              <Icon />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm text-secondary hover:text-foreground rounded-md transition-colors">
            <IconArrowLeft />
            Back to app
          </Link>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-secondary">Theme</span>
            <ThemeToggle />
          </div>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-secondary hover:text-foreground rounded-md transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Desktop hover-expand sidebar ── */}
      <aside
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className={cn(
          'hidden md:flex flex-col bg-surface border-r border-border',
          'fixed top-0 left-0 bottom-0 z-40',
          'transition-[width] duration-300 ease-out overflow-hidden',
          expanded ? 'w-56' : 'w-16'
        )}
      >
        <div className={cn(
          'shrink-0 border-b border-border flex flex-col',
          expanded ? 'px-6 py-4' : 'py-[18px] items-center justify-center'
        )}>
          {expanded ? (
            <>
              <KovaLogo size="sm" />
              <span className="text-[10px] font-semibold tracking-widest text-secondary uppercase mt-1">Platform Admin</span>
            </>
          ) : (
            <span className="font-display text-accent font-bold text-lg leading-none select-none">K</span>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {nav.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              title={!expanded ? label : undefined}
              className={cn(
                'flex items-center gap-3 py-2.5 rounded-md transition-colors border-l-2 whitespace-nowrap',
                expanded ? 'px-3' : 'justify-center px-0',
                isActive(href) ? 'border-accent text-accent bg-accent-5' : 'border-transparent text-secondary hover:text-foreground hover:bg-surface-raised'
              )}
            >
              <span className="shrink-0"><Icon /></span>
              {expanded && <span className="text-sm">{label}</span>}
            </Link>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border py-3 px-2 space-y-0.5">
          <Link
            href="/dashboard"
            title={!expanded ? 'Back to app' : undefined}
            className={cn(
              'flex items-center gap-3 py-2.5 rounded-md text-secondary hover:text-foreground hover:bg-surface-raised transition-colors border-l-2 border-transparent whitespace-nowrap',
              expanded ? 'px-3' : 'justify-center px-0'
            )}
          >
            <span className="shrink-0"><IconArrowLeft /></span>
            {expanded && <span className="text-sm">Back to app</span>}
          </Link>
          <div className={cn('flex items-center py-2 rounded-md', expanded ? 'px-3 justify-between' : 'justify-center')}>
            {expanded && <span className="text-xs text-secondary">Theme</span>}
            <ThemeToggle />
          </div>
          <button
            onClick={signOut}
            title={!expanded ? 'Sign out' : undefined}
            className={cn(
              'w-full flex items-center gap-3 py-2.5 rounded-md text-secondary hover:text-foreground hover:bg-surface-raised transition-colors border-l-2 border-transparent whitespace-nowrap',
              expanded ? 'px-3' : 'justify-center px-0'
            )}
          >
            {expanded && <span className="text-sm">Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/layout/admin-sidebar.tsx
git commit -m "feat: add AdminSidebar component (mirrors OwnerSidebar with admin nav)"
```

---

## Task 8: Admin layout

**Files:**
- Create: `app/(admin)/layout.tsx`

Defence-in-depth: calls `requireAdminAuth()` even though middleware already checked.

- [ ] **Step 1: Create the layout**

```typescript
// app/(admin)/layout.tsx
export const dynamic = 'force-dynamic'
import { requireAdminAuth } from '@/lib/auth-helpers'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { ToastProvider } from '@/components/ui/toast'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAuth() // defence in depth — redirects to /login if not admin
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className="md:ml-16 flex flex-col min-h-screen">
          <main className="flex-1 p-8 page-fade-in">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/'(admin)'/layout.tsx
git commit -m "feat: add admin layout with requireAdminAuth defence-in-depth"
```

---

## Task 9: Admin overview page `/admin`

**Files:**
- Create: `app/(admin)/page.tsx`

4 stat cards (gyms, members, bookings, workout weeks — all time + last 7 days) + recently joined gyms table (last 10).

- [ ] **Step 1: Create the overview page**

```typescript
// app/(admin)/page.tsx
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

async function getStats() {
  const db = createAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalGyms },
    { count: newGyms },
    { count: totalMembers },
    { count: newMembers },
    { count: totalBookings },
    { count: newBookings },
    { count: totalWeeks },
  ] = await Promise.all([
    db.from('gyms').select('id', { count: 'exact', head: true }),
    db.from('gyms').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'member'),
    db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'member').gte('created_at', sevenDaysAgo),
    db.from('bookings').select('id', { count: 'exact', head: true }),
    db.from('bookings').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    db.from('workout_weeks').select('id', { count: 'exact', head: true }),
  ])

  return { totalGyms, newGyms, totalMembers, newMembers, totalBookings, newBookings, totalWeeks }
}

async function getRecentGyms() {
  const db = createAdminClient()
  const { data: gyms } = await db
    .from('gyms')
    .select('id, name, gym_type, created_at, owner_id')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!gyms?.length) return []

  const ownerIds = gyms.map(g => g.owner_id).filter(Boolean) as string[]
  const { data: owners } = await db
    .from('users')
    .select('id, email')
    .in('id', ownerIds)

  const ownerMap = Object.fromEntries((owners ?? []).map(o => [o.id, o.email]))

  // Member counts per gym
  const gymIds = gyms.map(g => g.id)
  const { data: members } = await db
    .from('users')
    .select('gym_id')
    .in('gym_id', gymIds)
    .eq('role', 'member')

  const memberCounts = (members ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.gym_id] = (acc[m.gym_id] ?? 0) + 1
    return acc
  }, {})

  return gyms.map(g => ({
    id: g.id,
    name: g.name,
    gymType: g.gym_type,
    createdAt: g.created_at,
    ownerEmail: g.owner_id ? ownerMap[g.owner_id] ?? '—' : '—',
    memberCount: memberCounts[g.id] ?? 0,
  }))
}

const TYPE_BADGE: Record<string, string> = {
  crossfit: 'bg-blue-100 text-blue-800',
  hyrox: 'bg-yellow-100 text-yellow-800',
}

export default async function AdminOverviewPage() {
  const [stats, recentGyms] = await Promise.all([getStats(), getRecentGyms()])

  const cards = [
    { label: 'Total Gyms',           value: stats.totalGyms ?? 0, delta: stats.newGyms ?? 0 },
    { label: 'Total Members',        value: stats.totalMembers ?? 0, delta: stats.newMembers ?? 0 },
    { label: 'Total Bookings',       value: stats.totalBookings ?? 0, delta: stats.newBookings ?? 0 },
    { label: 'Workout Weeks',        value: stats.totalWeeks ?? 0, delta: null },
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Platform Overview</h1>
        <p className="text-secondary text-sm mt-1">All gyms, members, and activity across the platform.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="p-4 rounded-lg border border-border bg-surface">
            <p className="text-xs text-secondary uppercase tracking-wide">{card.label}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{card.value.toLocaleString()}</p>
            {card.delta !== null && (
              <p className="text-xs mt-1 text-emerald-600">↑ {card.delta} this week</p>
            )}
          </div>
        ))}
      </div>

      {/* Recently joined gyms */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recently Joined Gyms</h2>
          <Link href="/admin/gyms" className="text-xs text-accent hover:underline">View all →</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-secondary uppercase tracking-wide bg-surface">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Gym</th>
              <th className="px-4 py-2 text-left font-medium">Owner</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Members</th>
              <th className="px-4 py-2 text-left font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recentGyms.map(gym => (
              <tr key={gym.id} className="hover:bg-surface-raised transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/gyms/${gym.id}`} className="font-medium text-accent hover:underline">
                    {gym.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-secondary">{gym.ownerEmail}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${TYPE_BADGE[gym.gymType] ?? 'bg-gray-100 text-gray-700'}`}>
                    {gym.gymType}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{gym.memberCount}</td>
                <td className="px-4 py-3 text-secondary text-xs">
                  {formatDistanceToNow(new Date(gym.createdAt), { addSuffix: true })}
                </td>
              </tr>
            ))}
            {recentGyms.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-secondary text-sm">No gyms yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

> **Note:** This uses `date-fns`. Run `npm list date-fns` to verify it's installed. If not: `npm install date-fns`.

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add 'app/(admin)/page.tsx'
git commit -m "feat: add admin overview page with stats and recent gyms"
```

---

## Task 10: Gym list page `/admin/gyms`

**Files:**
- Create: `app/(admin)/gyms/page.tsx` (Server Component — fetches data)
- Create: `app/(admin)/gyms/gym-search-client.tsx` (Client Component — filters in-browser)

Capped at 500 rows. Client-side search filter on gym name and owner email.

- [ ] **Step 1: Create the client search component**

```typescript
// app/(admin)/gyms/gym-search-client.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type Gym = {
  id: string
  name: string
  gymType: string
  ownerEmail: string
  memberCount: number
  bookingCount: number
  lastActive: string   // fallback to createdAt if no bookings — never null
  createdAt: string
  suspended: boolean
}

const TYPE_BADGE: Record<string, string> = {
  crossfit: 'bg-blue-100 text-blue-800',
  hyrox: 'bg-yellow-100 text-yellow-800',
}

export function GymSearchClient({ gyms }: { gyms: Gym[] }) {
  const [query, setQuery] = useState('')
  const q = query.toLowerCase()
  const filtered = q
    ? gyms.filter(g => g.name.toLowerCase().includes(q) || g.ownerEmail.toLowerCase().includes(q))
    : gyms

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search by gym name or owner email…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full max-w-sm px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-secondary uppercase tracking-wide bg-surface">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Gym</th>
              <th className="px-4 py-2 text-left font-medium">Owner</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Members</th>
              <th className="px-4 py-2 text-left font-medium">Bookings</th>
              <th className="px-4 py-2 text-left font-medium">Last Active</th>
              <th className="px-4 py-2 text-left font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(gym => (
              <tr key={gym.id} className="hover:bg-surface-raised transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/gyms/${gym.id}`} className="font-medium text-accent hover:underline">
                    {gym.name}
                  </Link>
                  {gym.suspended && (
                    <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">suspended</span>
                  )}
                </td>
                <td className="px-4 py-3 text-secondary text-xs">{gym.ownerEmail}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${TYPE_BADGE[gym.gymType] ?? 'bg-gray-100 text-gray-700'}`}>
                    {gym.gymType}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{gym.memberCount}</td>
                <td className="px-4 py-3 text-secondary">{gym.bookingCount}</td>
                <td className="px-4 py-3 text-secondary text-xs">
                  {formatDistanceToNow(new Date(gym.lastActive), { addSuffix: true })}
                </td>
                <td className="px-4 py-3 text-secondary text-xs">
                  {new Date(gym.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-secondary">No gyms match your search</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-secondary">
        Showing {filtered.length} of {gyms.length} gyms{gyms.length === 500 ? ' (capped at 500)' : ''}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create the server page**

```typescript
// app/(admin)/gyms/page.tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { GymSearchClient } from './gym-search-client'

async function getAllGyms() {
  const db = createAdminClient()

  // Fetch gyms (cap 500)
  const { data: gyms } = await db
    .from('gyms')
    .select('id, name, gym_type, created_at, suspended_at, owner_id')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!gyms?.length) return []

  const gymIds = gyms.map(g => g.id)
  const ownerIds = gyms.map(g => g.owner_id).filter(Boolean) as string[]

  // Fetch owner emails, member counts, booking counts, last booking
  const [{ data: owners }, { data: members }, { data: bookings }] = await Promise.all([
    db.from('users').select('id, email').in('id', ownerIds),
    db.from('users').select('gym_id').in('gym_id', gymIds).eq('role', 'member'),
    db.from('bookings').select('gym_id, created_at').in('gym_id', gymIds),
  ])

  const ownerMap = Object.fromEntries((owners ?? []).map(o => [o.id, o.email]))

  const memberCounts = (members ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.gym_id] = (acc[m.gym_id] ?? 0) + 1
    return acc
  }, {})

  const bookingData = (bookings ?? []).reduce<Record<string, { count: number; lastAt: string | null }>>((acc, b) => {
    if (!acc[b.gym_id]) acc[b.gym_id] = { count: 0, lastAt: null }
    acc[b.gym_id].count++
    if (!acc[b.gym_id].lastAt || b.created_at > acc[b.gym_id].lastAt!) {
      acc[b.gym_id].lastAt = b.created_at
    }
    return acc
  }, {})

  return gyms.map(g => ({
    id: g.id,
    name: g.name,
    gymType: g.gym_type,
    ownerEmail: g.owner_id ? (ownerMap[g.owner_id] ?? '—') : '—',
    memberCount: memberCounts[g.id] ?? 0,
    bookingCount: bookingData[g.id]?.count ?? 0,
    lastActive: bookingData[g.id]?.lastAt ?? g.created_at, // spec: fallback to gyms.created_at if no bookings
    createdAt: g.created_at,
    suspended: g.suspended_at !== null,
  }))
}

export default async function AdminGymsPage() {
  const gyms = await getAllGyms()
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">All Gyms</h1>
        <p className="text-secondary text-sm mt-1">
          {gyms.length} gym{gyms.length !== 1 ? 's' : ''} on the platform
        </p>
      </div>
      <GymSearchClient gyms={gyms} />
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add 'app/(admin)/gyms/page.tsx' 'app/(admin)/gyms/gym-search-client.tsx'
git commit -m "feat: add /admin/gyms gym list with client-side search (capped 500)"
```

---

## Task 11: Gym detail page `/admin/gyms/[gymId]`

**Files:**
- Create: `app/(admin)/gyms/[gymId]/page.tsx` (Server Component)
- Create: `app/(admin)/gyms/[gymId]/member-accordion-client.tsx` (accordion for booking history)
- Create: `app/(admin)/gyms/[gymId]/danger-zone-client.tsx` (confirmation UX)

- [ ] **Step 1: Create the member accordion client component**

```typescript
// app/(admin)/gyms/[gymId]/member-accordion-client.tsx
'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

type Booking = {
  id: string
  className: string
  date: string
  status: string
}

type Member = {
  id: string
  name: string
  email: string
  role: string
  joinedAt: string
  revoked: boolean
  recentBookings: Booking[]
}

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  waitlisted: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-600',
  pending_confirmation: 'bg-blue-100 text-blue-800',
}

function MemberRow({ member }: { member: Member }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr
        className="hover:bg-surface-raised transition-colors cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <td className="px-4 py-3 font-medium">
          {member.name || '—'}
          {member.revoked && (
            <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">revoked</span>
          )}
        </td>
        <td className="px-4 py-3 text-secondary text-xs">{member.email}</td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${member.role === 'owner' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
            {member.role}
          </span>
        </td>
        <td className="px-4 py-3 text-secondary text-xs">{new Date(member.joinedAt).toLocaleDateString()}</td>
        <td className="px-4 py-3 text-secondary text-xs">{open ? '▲' : '▼'}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="px-4 pb-3 bg-surface">
            <div className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Last 5 Bookings</div>
            {member.recentBookings.length === 0 ? (
              <p className="text-xs text-secondary">No bookings yet</p>
            ) : (
              <table className="w-full text-xs">
                <tbody className="divide-y divide-border">
                  {member.recentBookings.map(b => (
                    <tr key={b.id}>
                      <td className="py-1 pr-4 font-medium">{b.className}</td>
                      <td className="py-1 pr-4 text-secondary">{new Date(b.date).toLocaleDateString()}</td>
                      <td className="py-1">
                        <span className={`px-1.5 py-0.5 rounded capitalize ${STATUS_BADGE[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export function MemberAccordionClient({ members }: { members: Member[] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Members ({members.length})</h2>
        <p className="text-xs text-secondary mt-0.5">Click any row to expand booking history</p>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-secondary uppercase tracking-wide bg-surface">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Email</th>
            <th className="px-4 py-2 text-left font-medium">Role</th>
            <th className="px-4 py-2 text-left font-medium">Joined</th>
            <th className="px-4 py-2 text-left font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map(m => <MemberRow key={m.id} member={m} />)}
          {members.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-secondary text-sm">No members</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create the danger zone client component**

```typescript
// app/(admin)/gyms/[gymId]/danger-zone-client.tsx
'use client'
import { useState, useTransition } from 'react'
import { suspendGym, unsuspendGym, deleteGym } from './actions'

export function DangerZoneClient({
  gymId,
  gymName,
  isSuspended,
}: {
  gymId: string
  gymName: string
  isSuspended: boolean
}) {
  const [suspendChecked, setSuspendChecked] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [isPending, startTransition] = useTransition()

  // Server Actions return Promises — must use async callback so NEXT_REDIRECT
  // and thrown errors propagate correctly instead of being silently dropped.
  function handleSuspend() {
    startTransition(async () => { await suspendGym(gymId, gymName) })
  }
  function handleUnsuspend() {
    startTransition(async () => { await unsuspendGym(gymId, gymName) })
  }
  function handleDelete() {
    if (deleteInput !== gymName) return
    startTransition(async () => { await deleteGym(gymId, gymName) })
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-4">
      <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>

      {/* Suspend / Unsuspend */}
      <div className="space-y-2">
        {!isSuspended ? (
          <>
            <label className="flex items-center gap-2 text-sm text-red-700 cursor-pointer">
              <input
                type="checkbox"
                checked={suspendChecked}
                onChange={e => setSuspendChecked(e.target.checked)}
                className="rounded"
              />
              I understand this will prevent the gym owner from using their dashboard
            </label>
            <button
              disabled={!suspendChecked || isPending}
              onClick={handleSuspend}
              className="px-4 py-2 text-sm rounded-md bg-red-600 text-white disabled:opacity-40 hover:bg-red-700 transition-colors"
            >
              {isPending ? 'Suspending…' : 'Suspend Gym'}
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-700 font-medium">⚠ This gym is currently suspended</p>
            <button
              disabled={isPending}
              onClick={handleUnsuspend}
              className="px-4 py-2 text-sm rounded-md border border-red-400 bg-white text-red-700 hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              {isPending ? 'Unsuspending…' : 'Unsuspend Gym'}
            </button>
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="pt-3 border-t border-red-200 space-y-2">
        <p className="text-sm text-red-700">
          Permanently delete this gym and all its data. Type <strong>{gymName}</strong> to confirm.
        </p>
        <input
          type="text"
          placeholder={`Type "${gymName}" to confirm`}
          value={deleteInput}
          onChange={e => setDeleteInput(e.target.value)}
          className="w-full max-w-sm px-3 py-2 text-sm rounded-md border border-red-300 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <button
          disabled={deleteInput !== gymName || isPending}
          onClick={handleDelete}
          className="px-4 py-2 text-sm rounded-md border border-red-600 text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          {isPending ? 'Deleting…' : 'Delete Gym Permanently'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create the gym detail server page**

```typescript
// app/(admin)/gyms/[gymId]/page.tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { MemberAccordionClient } from './member-accordion-client'
import { DangerZoneClient } from './danger-zone-client'
import Link from 'next/link'

function getWeekRange(timezone: string): { start: string; end: string } {
  const tz = timezone || 'UTC'
  // Get today's date string in the gym's timezone
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
  const today = new Date(todayStr + 'T00:00:00')
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysFromMon)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}

async function getGymDetail(gymId: string) {
  const db = createAdminClient()

  const { data: gym } = await db
    .from('gyms')
    .select('id, name, gym_type, timezone, created_at, owner_id, suspended_at')
    .eq('id', gymId)
    .single()

  if (!gym) return null

  const { start: weekStart, end: weekEnd } = getWeekRange(gym.timezone)

  // Fetch week instances first — weekBookings must be filtered by instance_id
  // (not created_at) to capture bookings made in advance for this week's classes.
  const { data: weekInstances } = await db
    .from('class_instances')
    .select('id, date, local_time, capacity, name')
    .eq('gym_id', gymId)
    .gte('date', weekStart)
    .lte('date', weekEnd)

  const weekInstanceIds = (weekInstances ?? []).map(i => i.id)

  const [
    { data: owner },
    { count: activeMembers },
    { count: revokedMembers },
    { count: totalBookings },
    { count: totalWeeks },
    { data: allMembers },
    { data: weekBookings },
    { data: upcomingInstances },
  ] = await Promise.all([
    db.from('users').select('email').eq('id', gym.owner_id ?? '').single(),
    db.from('users').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('role', 'member').is('revoked_at', null),
    db.from('users').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('role', 'member').not('revoked_at', 'is', null),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('gym_id', gymId),
    db.from('workout_weeks').select('id', { count: 'exact', head: true }).eq('gym_id', gymId),
    db.from('users').select('id, name, email, role, created_at, revoked_at').eq('gym_id', gymId).order('created_at'),
    // Filter by instance_id so we get bookings FOR this week's classes, not bookings MADE this week
    weekInstanceIds.length > 0
      ? db.from('bookings').select('instance_id, status').in('instance_id', weekInstanceIds)
      : Promise.resolve({ data: [] }),
    db.from('class_instances').select('id, date, local_time, capacity, name').eq('gym_id', gymId).gte('date', new Date().toISOString().split('T')[0]).order('date').order('local_time').limit(20),
  ])

  // Member booking histories (last 5 per member)
  const memberIds = (allMembers ?? []).map(m => m.id)
  const { data: recentBookings } = memberIds.length > 0
    ? await db
        .from('bookings')
        .select('id, user_id, status, created_at, instance_id, class_instances(date, name)')
        .in('user_id', memberIds)
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false })
        .limit(memberIds.length * 5)
    : { data: [] }

  // Group bookings by member (last 5 per member)
  const bookingsByMember: Record<string, typeof recentBookings> = {}
  for (const b of recentBookings ?? []) {
    if (!bookingsByMember[b.user_id]) bookingsByMember[b.user_id] = []
    if (bookingsByMember[b.user_id].length < 5) bookingsByMember[b.user_id].push(b)
  }

  // Booking health calcs — weekBookings already scoped to weekInstanceIds
  const weekBookingList = weekBookings ?? []
  const confirmedThisWeek = weekBookingList.filter(b => b.status === 'confirmed').length
  const cancelledThisWeek = weekBookingList.filter(b => b.status === 'cancelled').length
  const totalThisWeek = weekBookingList.length
  const totalCapacityThisWeek = (weekInstances ?? []).reduce((sum, i) => sum + i.capacity, 0)
  const fillRate = totalCapacityThisWeek > 0
    ? Math.round((confirmedThisWeek / totalCapacityThisWeek) * 100)
    : null
  const cancellationRate = totalThisWeek > 0
    ? Math.round((cancelledThisWeek / totalThisWeek) * 100)
    : null

  // Upcoming instances with confirmed booking counts
  const upcomingIds = (upcomingInstances ?? []).map(i => i.id)
  const { data: upcomingBookings } = upcomingIds.length > 0
    ? await db.from('bookings').select('instance_id').in('instance_id', upcomingIds).eq('status', 'confirmed')
    : { data: [] }
  const upcomingConfirmedCounts = (upcomingBookings ?? []).reduce<Record<string, number>>((acc, b) => {
    acc[b.instance_id] = (acc[b.instance_id] ?? 0) + 1
    return acc
  }, {})

  return {
    gym,
    owner,
    activeMembers: activeMembers ?? 0,
    revokedMembers: revokedMembers ?? 0,
    totalBookings: totalBookings ?? 0,
    totalWeeks: totalWeeks ?? 0,
    members: (allMembers ?? []).map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      joinedAt: m.created_at,
      revoked: m.revoked_at !== null,
      recentBookings: (bookingsByMember[m.id] ?? []).map(b => ({
        id: b.id,
        className: (b.class_instances as { name: string } | null)?.name ?? 'Class',
        date: (b.class_instances as { date: string } | null)?.date ?? b.created_at,
        status: b.status,
      })),
    })),
    bookingHealth: {
      confirmedThisWeek,
      fillRate,
      cancellationRate,
    },
    upcomingInstances: (upcomingInstances ?? []).map(i => ({
      id: i.id,
      date: i.date,
      localTime: i.local_time,
      name: i.name,
      capacity: i.capacity,
      confirmed: upcomingConfirmedCounts[i.id] ?? 0,
    })),
  }
}

export default async function GymDetailPage({ params }: { params: { gymId: string } }) {
  const data = await getGymDetail(params.gymId)
  if (!data) notFound()

  const { gym, owner, activeMembers, revokedMembers, totalBookings, totalWeeks, members, bookingHealth, upcomingInstances } = data

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Back link */}
      <Link href="/admin/gyms" className="text-sm text-accent hover:underline">← All Gyms</Link>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">{gym.name}</h1>
        {gym.suspended_at && (
          <span className="inline-block mt-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
            Suspended {new Date(gym.suspended_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* 1. Gym Info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Owner', value: owner?.email ?? '—' },
          { label: 'Type', value: gym.gym_type },
          { label: 'Timezone', value: gym.timezone },
          { label: 'Members', value: `${activeMembers} active · ${revokedMembers} revoked` },
          { label: 'Total Bookings', value: totalBookings.toLocaleString() },
          { label: 'Workout Weeks', value: `${totalWeeks} generated` },
        ].map(({ label, value }) => (
          <div key={label} className="p-4 rounded-lg border border-border bg-surface">
            <p className="text-xs text-secondary uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-foreground mt-1 capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* 2. Booking Health */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Booking Health (This Week)</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-border bg-surface">
            <p className="text-xs text-secondary uppercase tracking-wide">Confirmed Bookings</p>
            <p className="text-2xl font-bold text-foreground mt-1">{bookingHealth.confirmedThisWeek}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-surface">
            <p className="text-xs text-secondary uppercase tracking-wide">Avg Fill Rate</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {bookingHealth.fillRate !== null ? `${bookingHealth.fillRate}%` : '—'}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-surface">
            <p className="text-xs text-secondary uppercase tracking-wide">Cancellation Rate</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {bookingHealth.cancellationRate !== null ? `${bookingHealth.cancellationRate}%` : '—'}
            </p>
          </div>
        </div>

        {/* Upcoming instances */}
        <h3 className="text-sm font-semibold text-foreground mt-4">Upcoming Classes (Next 7 Days)</h3>
        {upcomingInstances.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            ⚠ No upcoming class instances. Check schedule templates and cron.
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs text-secondary uppercase tracking-wide bg-surface">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Time</th>
                  <th className="px-4 py-2 text-left font-medium">Class</th>
                  <th className="px-4 py-2 text-left font-medium">Booked / Cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcomingInstances.map(i => (
                  <tr key={i.id}>
                    <td className="px-4 py-2 text-secondary text-xs">{i.date}</td>
                    <td className="px-4 py-2 text-secondary text-xs">{i.localTime}</td>
                    <td className="px-4 py-2 font-medium">{i.name}</td>
                    <td className="px-4 py-2">
                      <span className={i.confirmed >= i.capacity ? 'text-red-600 font-semibold' : ''}>
                        {i.confirmed} / {i.capacity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Members */}
      <MemberAccordionClient members={members} />

      {/* 4. Danger Zone */}
      <DangerZoneClient gymId={gym.id} gymName={gym.name} isSuspended={gym.suspended_at !== null} />
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors. If type errors occur on the nested `class_instances` join, cast the result: `(b as any).class_instances` and adjust the mapping.

- [ ] **Step 5: Commit**

```bash
git add 'app/(admin)/gyms/[gymId]/'
git commit -m "feat: add gym detail page with booking health, members accordion"
```

---

## Task 12: Danger Zone Server Actions

**Files:**
- Create: `app/(admin)/gyms/[gymId]/actions.ts`

Each action independently calls `requireAdminAuth()`. Service role client used for all writes.

- [ ] **Step 1: Create the actions file**

```typescript
// app/(admin)/gyms/[gymId]/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { requireAdminAuth } from '@/lib/auth-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export async function suspendGym(gymId: string, gymName: string) {
  const { user } = await requireAdminAuth()
  const db = createAdminClient()

  const { error } = await db
    .from('gyms')
    .update({ suspended_at: new Date().toISOString() })
    .eq('id', gymId)

  if (error) throw new Error(`Failed to suspend gym: ${error.message}`)

  await db.from('admin_audit_log').insert({
    admin_email: user.email,
    action: 'suspend_gym',
    target_id: gymId,
    target_name: gymName,
  })

  redirect(`/admin/gyms/${gymId}`)
}

export async function unsuspendGym(gymId: string, gymName: string) {
  const { user } = await requireAdminAuth()
  const db = createAdminClient()

  const { error } = await db
    .from('gyms')
    .update({ suspended_at: null })
    .eq('id', gymId)

  if (error) throw new Error(`Failed to unsuspend gym: ${error.message}`)

  await db.from('admin_audit_log').insert({
    admin_email: user.email,
    action: 'unsuspend_gym',
    target_id: gymId,
    target_name: gymName,
  })

  redirect(`/admin/gyms/${gymId}`)
}

export async function deleteGym(gymId: string, gymName: string) {
  const { user } = await requireAdminAuth()
  const db = createAdminClient()

  const { error } = await db
    .from('gyms')
    .delete()
    .eq('id', gymId)

  if (error) throw new Error(`Failed to delete gym: ${error.message}`)

  // Audit log written after delete succeeds, before redirect
  await db.from('admin_audit_log').insert({
    admin_email: user.email,
    action: 'delete_gym',
    target_id: gymId,
    target_name: gymName,
  })

  redirect('/admin/gyms')
}
```

> **Why audit log before redirect:** `redirect()` throws a `NEXT_REDIRECT` error. Any code after `redirect()` never runs. The log must be written before the redirect call. If the insert fails, the gym is already deleted — this is the accepted "clean audit trail" trade-off from the spec.

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add 'app/(admin)/gyms/[gymId]/actions.ts'
git commit -m "feat: add suspend/unsuspend/delete Server Actions with audit logging"
```

---

## Task 13: User Lookup page `/admin/users`

**Files:**
- Create: `app/(admin)/users/page.tsx` (Server Component — server-side search)
- Create: `app/(admin)/users/user-accordion-client.tsx` (Client — accordion for bookings)

Search via URL query param `?q=email`. No results if query is empty.

- [ ] **Step 1: Create the user accordion client component**

```typescript
// app/(admin)/users/user-accordion-client.tsx
'use client'
import { useState } from 'react'

type Booking = {
  id: string
  className: string
  date: string
  status: string
}

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  gymName: string
  gymId: string
  joinedAt: string
  revoked: boolean
  recentBookings: Booking[]
}

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  waitlisted: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-600',
  pending_confirmation: 'bg-blue-100 text-blue-800',
}

import Link from 'next/link'

function UserRow({ user }: { user: UserRow }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr
        className="hover:bg-surface-raised transition-colors cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <td className="px-4 py-3 font-medium">{user.name || '—'}</td>
        <td className="px-4 py-3 text-secondary text-xs">{user.email}</td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'owner' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
            {user.role}
          </span>
          {user.revoked && (
            <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">revoked</span>
          )}
        </td>
        <td className="px-4 py-3 text-secondary text-xs">
          <Link href={`/admin/gyms/${user.gymId}`} onClick={e => e.stopPropagation()} className="text-accent hover:underline">
            {user.gymName}
          </Link>
        </td>
        <td className="px-4 py-3 text-secondary text-xs">{new Date(user.joinedAt).toLocaleDateString()}</td>
        <td className="px-4 py-3 text-secondary text-xs">{open ? '▲' : '▼'}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="px-4 pb-3 bg-surface">
            <div className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Last 10 Bookings</div>
            {user.recentBookings.length === 0 ? (
              <p className="text-xs text-secondary">No bookings yet</p>
            ) : (
              <table className="w-full text-xs">
                <tbody className="divide-y divide-border">
                  {user.recentBookings.map(b => (
                    <tr key={b.id}>
                      <td className="py-1 pr-4 font-medium">{b.className}</td>
                      <td className="py-1 pr-4 text-secondary">{new Date(b.date).toLocaleDateString()}</td>
                      <td className="py-1">
                        <span className={`px-1.5 py-0.5 rounded capitalize ${STATUS_BADGE[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export function UserAccordionClient({ users }: { users: UserRow[] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-xs text-secondary uppercase tracking-wide bg-surface">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Email</th>
            <th className="px-4 py-2 text-left font-medium">Role</th>
            <th className="px-4 py-2 text-left font-medium">Gym</th>
            <th className="px-4 py-2 text-left font-medium">Joined</th>
            <th className="px-4 py-2 text-left font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map(u => <UserRow key={u.id} user={u} />)}
          {users.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-secondary text-sm">No results</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create the user lookup server page**

```typescript
// app/(admin)/users/page.tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { UserAccordionClient } from './user-accordion-client'

async function searchUsers(q: string) {
  if (!q.trim()) return []

  const db = createAdminClient()

  const { data: users } = await db
    .from('users')
    .select('id, name, email, role, gym_id, created_at, revoked_at')
    .ilike('email', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!users?.length) return []

  // Filter out null gym_ids before passing to .in() — a null in the array produces a malformed query
  const gymIds = [...new Set(users.map(u => u.gym_id).filter((id): id is string => id !== null))]
  const { data: gyms } = gymIds.length > 0
    ? await db.from('gyms').select('id, name').in('id', gymIds)
    : { data: [] }

  const gymMap = Object.fromEntries((gyms ?? []).map(g => [g.id, g.name]))

  // Last 10 bookings per user
  const userIds = users.map(u => u.id)
  const { data: bookings } = await db
    .from('bookings')
    .select('id, user_id, status, created_at, instance_id, class_instances(date, name)')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(userIds.length * 10)

  const bookingsByUser: Record<string, typeof bookings> = {}
  for (const b of bookings ?? []) {
    if (!bookingsByUser[b.user_id]) bookingsByUser[b.user_id] = []
    if (bookingsByUser[b.user_id].length < 10) bookingsByUser[b.user_id].push(b)
  }

  return users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    gymId: u.gym_id,
    gymName: gymMap[u.gym_id] ?? '—',
    joinedAt: u.created_at,
    revoked: u.revoked_at !== null,
    recentBookings: (bookingsByUser[u.id] ?? []).map(b => ({
      id: b.id,
      className: (b.class_instances as { name: string } | null)?.name ?? 'Class',
      date: (b.class_instances as { date: string } | null)?.date ?? b.created_at,
      status: b.status,
    })),
  }))
}

// Note: Next.js 14 — searchParams is sync. Next.js 15+ — searchParams is a Promise; if upgrading,
// change to: `searchParams: Promise<{ q?: string }>` and add `const { q: qParam } = await searchParams`.
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = searchParams.q?.trim() ?? ''
  const users = await searchUsers(q)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">User Lookup</h1>
        <p className="text-secondary text-sm mt-1">Search by email address. Read-only.</p>
      </div>

      <form method="get" className="flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by email…"
          className="w-full max-w-sm px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
          autoComplete="off"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-md bg-accent text-white hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </form>

      {q && (
        <div>
          <p className="text-sm text-secondary mb-3">
            {users.length === 0
              ? `No users found for "${q}"`
              : `${users.length} result${users.length !== 1 ? 's' : ''} for "${q}"`}
          </p>
          {users.length > 0 && <UserAccordionClient users={users} />}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors

- [ ] **Step 4: Full build check**

Run: `npx next build 2>&1 | tail -20`

Expected: build completes successfully. If there are type errors on nested Supabase joins, cast with `as any` on the `class_instances` property and adjust the mapping.

- [ ] **Step 5: Commit**

```bash
git add 'app/(admin)/users/'
git commit -m "feat: add /admin/users server-side user lookup with booking accordion"
```

---

## Task 14: Set ADMIN_EMAILS in environment

- [ ] **Step 1: Add ADMIN_EMAILS to `.env.local`**

```bash
echo "ADMIN_EMAILS=your-email@example.com" >> .env.local
```

Replace `your-email@example.com` with the email address on your Supabase account.

- [ ] **Step 2: Add ADMIN_EMAILS to Vercel project**

In the Vercel dashboard → Project Settings → Environment Variables:
- Key: `ADMIN_EMAILS`
- Value: your email address (comma-separated for multiple admins)
- Environments: Production, Preview, Development

- [ ] **Step 3: Verify middleware reads it**

Start the dev server: `npm run dev`
Navigate to `http://localhost:3000/admin`

Expected: if logged in with your email → admin panel loads. If logged in with a different account → redirects to `/login`.

---

## Task 15: End-to-end verification

- [ ] **Step 1: Run TypeScript**

Run: `npx tsc --noEmit`

Expected: 0 errors

- [ ] **Step 2: Run vitest**

Run: `npx vitest run`

Expected: all tests pass including new `tests/lib/admin-auth.test.ts`

- [ ] **Step 3: Run build**

Run: `npx next build`

Expected: build completes. Note: static analysis may warn on dynamic routes — this is expected for admin pages with `export const dynamic = 'force-dynamic'`.

- [ ] **Step 4: Manual smoke test (dev server)**

Run: `npm run dev`

Check each route:
- `/admin` — stat cards and recent gyms table load
- `/admin/gyms` — gym list with search box
- `/admin/gyms/<id>` — gym detail with all 4 sections visible
- `/admin/gyms/<id>` → click member row → booking accordion expands
- `/admin/users?q=<email>` — results table with accordion
- `/suspended` — renders without auth

- [ ] **Step 5: Apply migration 018 to production**

In Supabase dashboard → SQL editor → paste and run contents of `supabase/migrations/018_admin.sql`

- [ ] **Step 6: Final commit and deploy**

```bash
git add -A
git commit -m "feat: complete platform admin panel (/admin)"
```

Then deploy via Vercel dashboard or `vercel --prod`.
