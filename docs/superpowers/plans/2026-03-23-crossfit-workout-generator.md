# CrossFit Workout Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app where gym owners generate AI-powered weekly CrossFit workouts and members view/book class slots.

**Architecture:** Next.js 14 App Router with two role-based dashboard layouts (owner/member), Supabase for auth + database + edge function cron jobs, Claude API for workout generation, Resend for email.

**Tech Stack:** Next.js 14, Tailwind CSS, Supabase (PostgreSQL + Auth + Edge Functions), Claude API (`claude-sonnet-4-6`), Resend, Vercel, Vitest for unit tests.

---

## File Map

```
crossfit-app/
├── app/
│   ├── layout.tsx                          # Root layout, fonts
│   ├── middleware.ts                        # Auth guard + role routing
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── invite/page.tsx                 # Member accepts invite, sets password
│   ├── (owner)/
│   │   ├── layout.tsx                      # Sidebar nav
│   │   ├── dashboard/page.tsx              # Weekly Program
│   │   ├── style-profile/page.tsx          # Example workouts
│   │   ├── schedule/page.tsx               # Class templates + roster
│   │   ├── members/page.tsx                # Invite/revoke members
│   │   └── settings/page.tsx              # Gym name, timezone
│   └── (member)/
│       ├── layout.tsx                      # Top nav
│       ├── this-week/page.tsx              # Workouts + booking
│       ├── my-schedule/page.tsx            # Upcoming bookings
│       └── profile/page.tsx
├── app/api/
│   ├── workouts/generate/route.ts
│   ├── workouts/approve/route.ts
│   ├── workouts/discard/route.ts
│   ├── bookings/route.ts                   # POST book, DELETE cancel
│   ├── bookings/confirm/[token]/route.ts   # Waitlist confirmation
│   ├── members/invite/route.ts
│   ├── members/revoke/route.ts
│   └── schedule/templates/route.ts
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── modal.tsx
│   │   ├── skeleton.tsx
│   │   └── badge.tsx
│   ├── workout/
│   │   ├── workout-card.tsx                # Single day card (glassmorphism)
│   │   └── workout-week-grid.tsx           # 5-col Mon–Fri grid
│   ├── booking/
│   │   ├── class-slot.tsx                  # Time slot + book button
│   │   └── booking-list.tsx               # My Schedule list
│   └── layout/
│       ├── owner-sidebar.tsx
│       └── member-nav.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                       # Browser client
│   │   ├── server.ts                       # Server client (cookies)
│   │   └── types.ts                        # Generated DB types
│   ├── claude/
│   │   ├── prompts.ts                      # Prompt builder
│   │   └── generate-workouts.ts            # API call + validation
│   ├── email/
│   │   ├── send.ts                         # Resend wrapper
│   │   └── templates.ts                    # All email HTML templates
│   ├── bookings/
│   │   └── waitlist.ts                     # Promotion logic
│   └── types.ts                            # Shared TS types
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql
│   │   └── 002_rls.sql
│   └── functions/
│       ├── _shared/waitlist.ts                 # Deno-compatible waitlist promotion logic
│       ├── generate-class-instances/index.ts   # Nightly cron
│       └── process-waitlist-expiry/index.ts    # Nightly cron
└── tests/
    ├── lib/claude/generate-workouts.test.ts
    ├── lib/bookings/waitlist.test.ts
    └── api/bookings.test.ts
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `crossfit-app/` (project root)
- Create: `tailwind.config.ts`
- Create: `app/layout.tsx`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit
npx create-next-app@14 crossfit-app --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd crossfit-app
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk resend
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Configure design tokens in `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: '#141414',
        accent: '#D4AF37',
        'accent-border': 'rgba(212,175,55,0.2)',
        danger: '#EF4444',
        secondary: '#9CA3AF',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        btn: '4px',
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 4: Set up root layout with fonts**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = { title: 'CrossFit Generator' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-background text-white font-body antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 5: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

Create `tests/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add `.env.local` placeholder**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_claude_api_key
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```
Expected: Server running at http://localhost:3000

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js project with Tailwind design tokens"
```

---

## Task 2: Database Schema

**Files:**
- Create: `supabase/migrations/001_schema.sql`
- Create: `supabase/migrations/002_rls.sql`

- [ ] **Step 1: Install Supabase CLI and init**

```bash
npm install -g supabase
supabase init
supabase login
```

- [ ] **Step 2: Write schema migration**

Create `supabase/migrations/001_schema.sql`:
```sql
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Gyms
create table gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'UTC',
  owner_id uuid, -- set after users created; FK added below
  created_at timestamptz not null default now()
);

-- Users
create table users (
  id uuid primary key, -- matches Supabase Auth UID
  gym_id uuid not null references gyms(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table gyms add constraint gyms_owner_id_fkey
  foreign key (owner_id) references users(id);

-- Style examples
create table style_examples (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  raw_text text not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- Workout weeks
create table workout_weeks (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  week_start date not null, -- always a Monday
  workouts jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft','published','discarded')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(gym_id, week_start, status) -- only one draft per gym per week
);

-- Class slot templates
create table class_slot_templates (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 7),
  local_time time not null,
  capacity int not null default 20,
  active boolean not null default true
);

-- Class instances
create table class_instances (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  template_id uuid references class_slot_templates(id) on delete set null,
  date date not null,
  local_time time not null,
  starts_at timestamptz not null, -- UTC anchor, DST-safe
  capacity int not null default 20
);

-- Bookings
create table bookings (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  instance_id uuid not null references class_instances(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'confirmed'
    check (status in ('confirmed','waitlisted','pending_confirmation','cancelled')),
  waitlist_position int,
  confirmation_token uuid unique,
  confirmation_expires_at timestamptz,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique(instance_id, user_id)
);

-- Indexes
create index on class_instances(gym_id, date);
create index on bookings(instance_id, status);
create index on bookings(confirmation_token) where confirmation_token is not null;
create index on workout_weeks(gym_id, week_start);
```

- [ ] **Step 3: Write RLS migration**

Create `supabase/migrations/002_rls.sql`:
```sql
-- Enable RLS on all tables
alter table gyms enable row level security;
alter table users enable row level security;
alter table style_examples enable row level security;
alter table workout_weeks enable row level security;
alter table class_slot_templates enable row level security;
alter table class_instances enable row level security;
alter table bookings enable row level security;

-- Helper: get gym_id for current user
create or replace function current_gym_id()
returns uuid language sql stable as $$
  select gym_id from users where id = auth.uid()
$$;

-- Helper: get role for current user
create or replace function current_role()
returns text language sql stable as $$
  select role from users where id = auth.uid()
$$;

-- Gyms: owner can read/update their gym
create policy "owner reads own gym" on gyms
  for select using (id = current_gym_id());
create policy "owner updates own gym" on gyms
  for update using (owner_id = auth.uid());

-- Users: users read members of their gym; owner can insert/update
create policy "users read same gym" on users
  for select using (gym_id = current_gym_id());
create policy "owner manages members" on users
  for all using (current_role() = 'owner' and gym_id = current_gym_id());

-- Style examples: owner only
create policy "owner manages style examples" on style_examples
  for all using (current_role() = 'owner' and gym_id = current_gym_id());

-- Workout weeks: owner sees all; members see published only
create policy "owner sees all workout weeks" on workout_weeks
  for select using (current_role() = 'owner' and gym_id = current_gym_id());
create policy "owner manages workout weeks" on workout_weeks
  for all using (current_role() = 'owner' and gym_id = current_gym_id());
create policy "member sees published workout weeks" on workout_weeks
  for select using (
    current_role() = 'member'
    and gym_id = current_gym_id()
    and status = 'published'
    and archived_at is null
  );

-- Class slot templates: owner manages; members read active
create policy "owner manages templates" on class_slot_templates
  for all using (current_role() = 'owner' and gym_id = current_gym_id());
create policy "member reads active templates" on class_slot_templates
  for select using (gym_id = current_gym_id() and active = true);

-- Class instances: all gym members read; owner manages
create policy "gym members read instances" on class_instances
  for select using (gym_id = current_gym_id());
create policy "owner manages instances" on class_instances
  for all using (current_role() = 'owner' and gym_id = current_gym_id());

-- Bookings: members see own; owner sees all in gym
create policy "member sees own bookings" on bookings
  for select using (user_id = auth.uid());
create policy "member manages own bookings" on bookings
  for all using (user_id = auth.uid() and gym_id = current_gym_id());
create policy "owner sees all bookings" on bookings
  for select using (current_role() = 'owner' and gym_id = current_gym_id());
```

- [ ] **Step 4: Apply migrations to local Supabase**

```bash
supabase start
supabase db push
```
Expected: Migrations applied, no errors.

- [ ] **Step 5: Generate TypeScript types**

```bash
supabase gen types typescript --local > lib/supabase/types.ts
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add database schema and RLS policies"
```

---

## Task 3: Supabase Client Setup + Middleware

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Write browser Supabase client**

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Write server Supabase client**

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

- [ ] **Step 3: Write middleware for auth + role routing**

```ts
// middleware.ts
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
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add Supabase client helpers and auth middleware"
```

---

## Task 4: Auth Pages (Login, Signup, Invite)

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`
- Create: `app/(auth)/invite/page.tsx`
- Create: `app/api/auth/signup/route.ts`

- [ ] **Step 1: Write shared auth form styles in `components/ui/button.tsx`**

```tsx
// components/ui/button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'px-4 py-2 rounded-btn text-sm font-medium transition-all duration-200',
        variant === 'primary' && 'border border-accent text-white hover:bg-accent hover:text-black',
        variant === 'danger' && 'border border-danger text-danger hover:bg-danger hover:text-white',
        variant === 'ghost' && 'text-secondary hover:text-white',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
Button.displayName = 'Button'
```

Create `lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

```bash
npm install clsx tailwind-merge
```

- [ ] **Step 2: Write login page**

```tsx
// app/(auth)/login/page.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-surface rounded-card border border-accent-border">
        <h1 className="font-display text-2xl text-white mb-6">Sign In</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required
            className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white placeholder-secondary focus:outline-none focus:border-accent"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required
            className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white placeholder-secondary focus:outline-none focus:border-accent"
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button type="submit" className="w-full">Sign In</Button>
        </form>
        <p className="mt-4 text-secondary text-sm text-center">
          New gym? <a href="/signup" className="text-accent hover:underline">Create account</a>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write owner signup API route**

```ts
// app/api/auth/signup/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { email, password, gymName, timezone } = await req.json()

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const userId = authData.user.id

  // 2. Create gym (no owner_id yet to avoid circular FK)
  const { data: gym, error: gymError } = await supabase
    .from('gyms').insert({ name: gymName, timezone }).select().single()
  if (gymError) return NextResponse.json({ error: gymError.message }, { status: 400 })

  // 3. Create user row
  const { error: userError } = await supabase.from('users').insert({
    id: userId, gym_id: gym.id, email, role: 'owner'
  })
  if (userError) return NextResponse.json({ error: userError.message }, { status: 400 })

  // 4. Set owner_id on gym
  await supabase.from('gyms').update({ owner_id: userId }).eq('id', gym.id)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Write signup page**

```tsx
// app/(auth)/signup/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const TIMEZONES = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Australia/Sydney']

export default function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '', gymName: '', timezone: 'America/New_York' })
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-surface rounded-card border border-accent-border">
        <h1 className="font-display text-2xl text-white mb-6">Create Your Gym</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {['gymName','email','password'].map(field => (
            <input key={field} type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
              value={(form as any)[field]} onChange={e => setForm(f => ({...f, [field]: e.target.value}))}
              placeholder={field === 'gymName' ? 'Gym Name' : field.charAt(0).toUpperCase() + field.slice(1)}
              required className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white placeholder-secondary focus:outline-none focus:border-accent"
            />
          ))}
          <select value={form.timezone} onChange={e => setForm(f => ({...f, timezone: e.target.value}))}
            className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white focus:outline-none focus:border-accent">
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button type="submit" className="w-full">Create Account</Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write invite acceptance page**

```tsx
// app/(auth)/invite/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function InvitePage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); return }
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-surface rounded-card border border-accent-border">
        <h1 className="font-display text-2xl text-white mb-2">Set Your Password</h1>
        <p className="text-secondary text-sm mb-6">Welcome! Set a password to access your gym.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="New password" minLength={8} required
            className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white placeholder-secondary focus:outline-none focus:border-accent"
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button type="submit" className="w-full">Set Password & Enter</Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add auth pages (login, signup, invite)"
```

---

## Task 5: UI Base Components

**Files:**
- Create: `components/ui/card.tsx`
- Create: `components/ui/modal.tsx`
- Create: `components/ui/skeleton.tsx`
- Create: `components/ui/badge.tsx`

- [ ] **Step 1: Write Card component (glassmorphism)**

```tsx
// components/ui/card.tsx
import { cn } from '@/lib/utils'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn(
      'bg-surface backdrop-blur-md border border-accent-border rounded-card p-4',
      className
    )}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Write Modal component**

```tsx
// components/ui/modal.tsx
'use client'
import { useEffect } from 'react'
import { Button } from './button'

interface ModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export function Modal({ open, title, description, confirmLabel = 'Confirm', confirmVariant = 'primary', onConfirm, onCancel }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative bg-surface border border-accent-border rounded-card p-6 max-w-md w-full mx-4">
        <h2 className="font-display text-xl text-white mb-2">{title}</h2>
        <p className="text-secondary text-sm mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write Skeleton component**

```tsx
// components/ui/skeleton.tsx
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-white/5 rounded-card', className)} />
  )
}
```

- [ ] **Step 4: Write Badge component**

```tsx
// components/ui/badge.tsx
import { cn } from '@/lib/utils'

type BadgeVariant = 'draft' | 'published' | 'confirmed' | 'waitlisted'

const variants: Record<BadgeVariant, string> = {
  draft: 'bg-white/10 text-secondary',
  published: 'bg-accent/20 text-accent',
  confirmed: 'bg-green-500/20 text-green-400',
  waitlisted: 'bg-white/10 text-secondary',
}

export function Badge({ variant, label }: { variant: BadgeVariant; label: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant])}>
      {label}
    </span>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add base UI components (Card, Modal, Skeleton, Badge)"
```

---

## Task 6: Claude API — Workout Generation

**Files:**
- Create: `lib/claude/prompts.ts`
- Create: `lib/claude/generate-workouts.ts`
- Create: `lib/types.ts`
- Create: `tests/lib/claude/generate-workouts.test.ts`

- [ ] **Step 1: Define shared types**

```ts
// lib/types.ts
export interface WorkoutPart {
  label: string | null
  type: 'strength' | 'interval' | 'amrap' | 'fortime' | 'partner' | 'emom' | 'rest'
  content: string
}

export interface WorkoutDay {
  day: string
  descriptor?: string
  parts: WorkoutPart[]
}

export type WorkoutWeek = WorkoutDay[]
```

- [ ] **Step 2: Write the prompt builder**

```ts
// lib/claude/prompts.ts
import type { WorkoutWeek } from '@/lib/types'

export function buildGenerationPrompt(
  styleExamples: string[],
  history: WorkoutWeek[]
): string {
  const examplesText = styleExamples.join('\n\n---\n\n')
  const historyText = history.length === 0
    ? 'No previous weeks — this is the first week.'
    : history.map((week, i) => `Week ${i + 1}:\n${JSON.stringify(week, null, 2)}`).join('\n\n')

  return `You are a CrossFit programming coach. Generate a new Mon–Fri workout week that matches the style of the examples below.

## Style Examples (match this format exactly)
${examplesText}

## Previous Weeks (build progressively — do not repeat primary movements on back-to-back days)
${historyText}

## Output Requirements
Return ONLY a valid JSON array of 5 day objects. No markdown, no explanation, just the JSON.
Each day object must match this schema exactly:
{
  "day": string,          // e.g. "Monday"
  "descriptor"?: string,  // e.g. "Strength", "Partner Workout" — optional
  "parts": [
    {
      "label": string | null,   // e.g. "Part A", "Each for time", null
      "type": string,           // one of: strength, interval, amrap, fortime, partner, emom, rest
      "content": string         // workout content, use \\n for line breaks
    }
  ]
}

Rules:
- Follow the exact same formatting conventions as the examples (minute markers, time caps, sets x reps notation)
- Do not repeat the same primary barbell movement on consecutive days
- Vary movement patterns across the week (push/pull/hinge/squat)
- Keep the same day types as the examples (Mon/Fri = interval, Wed = strength, Thu = partner, Tue = for time)`
}
```

- [ ] **Step 3: Write failing test**

```ts
// tests/lib/claude/generate-workouts.test.ts
import { describe, it, expect, vi } from 'vitest'
import { generateWorkouts, validateWorkoutWeek } from '@/lib/claude/generate-workouts'

describe('validateWorkoutWeek', () => {
  it('returns true for valid week', () => {
    const week = [
      { day: 'Monday', parts: [{ label: 'Part A', type: 'strength', content: 'Deadlift' }] },
      { day: 'Tuesday', parts: [{ label: null, type: 'fortime', content: '21-15-9' }] },
      { day: 'Wednesday', parts: [{ label: null, type: 'strength', content: 'Back Squat' }] },
      { day: 'Thursday', parts: [{ label: null, type: 'partner', content: '28 min cap' }] },
      { day: 'Friday', parts: [{ label: 'Part A', type: 'strength', content: 'Press' }] },
    ]
    expect(validateWorkoutWeek(week)).toBe(true)
  })

  it('returns false for non-array', () => {
    expect(validateWorkoutWeek(null)).toBe(false)
    expect(validateWorkoutWeek({ day: 'Monday' })).toBe(false)
  })

  it('returns false if not 5 days', () => {
    expect(validateWorkoutWeek([{ day: 'Monday', parts: [] }])).toBe(false)
  })

  it('returns false if a day has no "day" string', () => {
    const bad = Array(5).fill(null).map((_, i) => ({
      day: i === 2 ? 123 : 'Day',
      parts: []
    }))
    expect(validateWorkoutWeek(bad)).toBe(false)
  })
})
```

- [ ] **Step 4: Run test — expect fail**

```bash
npx vitest run tests/lib/claude/generate-workouts.test.ts
```
Expected: FAIL — `validateWorkoutWeek` not found

- [ ] **Step 5: Implement `generate-workouts.ts`**

```ts
// lib/claude/generate-workouts.ts
import Anthropic from '@anthropic-ai/sdk'
import { buildGenerationPrompt } from './prompts'
import type { WorkoutWeek } from '@/lib/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export function validateWorkoutWeek(data: unknown): data is WorkoutWeek {
  if (!Array.isArray(data)) return false
  if (data.length !== 5) return false
  return data.every(
    (d) =>
      typeof d === 'object' &&
      d !== null &&
      typeof d.day === 'string' &&
      Array.isArray(d.parts)
  )
}

async function callClaude(prompt: string): Promise<WorkoutWeek | null> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const parsed = JSON.parse(text)
    return validateWorkoutWeek(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function generateWorkouts(
  styleExamples: string[],
  history: WorkoutWeek[]
): Promise<WorkoutWeek> {
  const prompt = buildGenerationPrompt(styleExamples, history)

  const result = await callClaude(prompt)
  if (result) return result

  // One automatic retry
  const retry = await callClaude(prompt)
  if (retry) return retry

  throw new Error('Failed to generate valid workouts after 2 attempts')
}
```

- [ ] **Step 6: Run test — expect pass**

```bash
npx vitest run tests/lib/claude/generate-workouts.test.ts
```
Expected: PASS

- [ ] **Step 7: Write generate API route**

```ts
// app/api/workouts/generate/route.ts
import { createClient } from '@/lib/supabase/server'
import { generateWorkouts } from '@/lib/claude/generate-workouts'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get gym
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const gymId = userData.gym_id
  const { weekStart } = await req.json()

  // Get style examples (active only)
  const { data: examples } = await supabase
    .from('style_examples').select('raw_text')
    .eq('gym_id', gymId).is('archived_at', null)

  if (!examples || examples.length < 3) {
    return NextResponse.json({ error: 'Need at least 3 style examples' }, { status: 400 })
  }

  // Get last 4 published weeks (not archived)
  const { data: history } = await supabase
    .from('workout_weeks').select('workouts')
    .eq('gym_id', gymId).eq('status', 'published').is('archived_at', null)
    .order('week_start', { ascending: false }).limit(4)

  const historyWeeks = (history || []).map(h => h.workouts).reverse()
  const styleTexts = examples.map(e => e.raw_text)

  // Delete any existing draft for this week
  await supabase.from('workout_weeks')
    .update({ status: 'discarded' })
    .eq('gym_id', gymId).eq('week_start', weekStart).eq('status', 'draft')

  const workouts = await generateWorkouts(styleTexts, historyWeeks)

  const { data: week, error } = await supabase.from('workout_weeks')
    .insert({ gym_id: gymId, week_start: weekStart, workouts, status: 'draft' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ week })
}
```

- [ ] **Step 8: Write approve and discard routes**

```ts
// app/api/workouts/approve/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendWorkoutsPublishedEmail } from '@/lib/email/send'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekId } = await req.json()
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('workout_weeks')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', weekId).eq('gym_id', userData.gym_id).eq('status', 'draft')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email to all active members
  const { data: members } = await supabase.from('users')
    .select('email, name').eq('gym_id', userData.gym_id)
    .eq('role', 'member').is('revoked_at', null)

  if (members) await sendWorkoutsPublishedEmail(members)

  return NextResponse.json({ success: true })
}
```

```ts
// app/api/workouts/discard/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekId } = await req.json()
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabase.from('workout_weeks')
    .update({ status: 'discarded' })
    .eq('id', weekId).eq('gym_id', userData.gym_id)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: Claude workout generation with validate/retry, approve/discard API routes"
```

---

## Task 7: Email Notifications

**Files:**
- Create: `lib/email/send.ts`
- Create: `lib/email/templates.ts`

- [ ] **Step 1: Write email templates**

```ts
// lib/email/templates.ts
export function bookingConfirmedHtml(name: string, date: string, time: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">Booking Confirmed</h2>
    <p>Hi ${name},</p>
    <p>Your spot is confirmed for <strong>${date}</strong> at <strong>${time}</strong>.</p>
    <p style="color:#9CA3AF;font-size:12px">Cancel up to 1 hour before class.</p>
  </div>`
}

export function waitlistPromotionHtml(name: string, date: string, time: string, confirmUrl: string, expiresIn: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">Spot Available</h2>
    <p>Hi ${name}, a spot opened for <strong>${date}</strong> at <strong>${time}</strong>.</p>
    <p>Confirm within <strong>${expiresIn}</strong>:</p>
    <a href="${confirmUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#D4AF37;color:#000;text-decoration:none;border-radius:4px;font-weight:600">Confirm My Spot</a>
  </div>`
}

export function workoutsPublishedHtml(gymName: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">This Week's Workouts Are Live</h2>
    <p>${gymName} has published the workouts for this week. Log in to view and book your classes.</p>
  </div>`
}

export function memberInvitedHtml(gymName: string, inviteUrl: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">You're Invited</h2>
    <p>You've been invited to join <strong>${gymName}</strong>.</p>
    <a href="${inviteUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#D4AF37;color:#000;text-decoration:none;border-radius:4px;font-weight:600">Accept Invite</a>
  </div>`
}

export function bookingCancelledHtml(name: string, date: string, time: string) {
  return `<div style="font-family:Inter,sans-serif;background:#0A0A0A;color:#fff;padding:32px;max-width:500px">
    <h2 style="color:#D4AF37;font-family:Georgia,serif">Booking Cancelled</h2>
    <p>Hi ${name}, your booking for <strong>${date}</strong> at <strong>${time}</strong> has been cancelled.</p>
  </div>`
}
```

- [ ] **Step 2: Write Resend send wrapper**

```ts
// lib/email/send.ts
import { Resend } from 'resend'
import {
  bookingConfirmedHtml, waitlistPromotionHtml,
  workoutsPublishedHtml, memberInvitedHtml, bookingCancelledHtml
} from './templates'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'noreply@yourgym.com' // update with verified domain

export async function sendBookingConfirmed(to: string, name: string, date: string, time: string) {
  await resend.emails.send({ from: FROM, to, subject: 'Booking Confirmed', html: bookingConfirmedHtml(name, date, time) })
}

export async function sendWaitlistPromotion(to: string, name: string, date: string, time: string, confirmUrl: string, expiresIn: string) {
  await resend.emails.send({ from: FROM, to, subject: 'Spot Available — Confirm Now', html: waitlistPromotionHtml(name, date, time, confirmUrl, expiresIn) })
}

export async function sendWorkoutsPublishedEmail(members: { email: string; name: string }[], gymName = 'Your Gym') {
  await Promise.allSettled(
    members.map(m => resend.emails.send({ from: FROM, to: m.email, subject: "This Week's Workouts Are Live", html: workoutsPublishedHtml(gymName) }))
  )
}

export async function sendMemberInvite(to: string, gymName: string, inviteUrl: string) {
  await resend.emails.send({ from: FROM, to, subject: `You're invited to ${gymName}`, html: memberInvitedHtml(gymName, inviteUrl) })
}

export async function sendBookingCancelled(to: string, name: string, date: string, time: string) {
  await resend.emails.send({ from: FROM, to, subject: 'Booking Cancelled', html: bookingCancelledHtml(name, date, time) })
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add email templates and Resend send helpers"
```

---

## Task 8: Booking & Waitlist Logic

**Files:**
- Create: `lib/bookings/waitlist.ts`
- Create: `tests/lib/bookings/waitlist.test.ts`
- Create: `app/api/bookings/route.ts`
- Create: `app/api/bookings/confirm/[token]/route.ts`

- [ ] **Step 1: Write failing waitlist tests**

```ts
// tests/lib/bookings/waitlist.test.ts
import { describe, it, expect } from 'vitest'
import { shouldSkipPromotion, getConfirmationWindow } from '@/lib/bookings/waitlist'

describe('shouldSkipPromotion', () => {
  it('returns true when class starts within 2 hours', () => {
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1h from now
    expect(shouldSkipPromotion(soon)).toBe(true)
  })

  it('returns false when class starts more than 2 hours away', () => {
    const later = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() // 3h from now
    expect(shouldSkipPromotion(later)).toBe(false)
  })
})

describe('getConfirmationWindow', () => {
  it('returns 2 hours when class is far away', () => {
    const later = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
    const window = getConfirmationWindow(later)
    expect(window).toBe(2 * 60 * 60 * 1000)
  })

  it('returns time until class when class is between 2-4 hours away', () => {
    const inThreeHours = new Date(Date.now() + 3 * 60 * 60 * 1000)
    const window = getConfirmationWindow(inThreeHours.toISOString())
    // Should be approximately 3h - 2ms tolerance
    expect(window).toBeLessThan(3 * 60 * 60 * 1000 + 100)
    expect(window).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
npx vitest run tests/lib/bookings/waitlist.test.ts
```

- [ ] **Step 3: Implement waitlist helpers**

```ts
// lib/bookings/waitlist.ts
import { createClient } from '@supabase/supabase-js'
import { sendWaitlistPromotion } from '@/lib/email/send'

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

export function shouldSkipPromotion(startsAt: string): boolean {
  return new Date(startsAt).getTime() - Date.now() <= TWO_HOURS_MS
}

export function getConfirmationWindow(startsAt: string): number {
  const timeUntilClass = new Date(startsAt).getTime() - Date.now()
  return Math.min(TWO_HOURS_MS, timeUntilClass)
}

export async function promoteNextWaitlistMember(
  supabase: ReturnType<typeof createClient>,
  instanceId: string,
  startsAt: string,
  appUrl: string
) {
  if (shouldSkipPromotion(startsAt)) return

  // Get next waitlisted member
  const { data: next } = await supabase
    .from('bookings')
    .select('id, user_id, users(email, name)')
    .eq('instance_id', instanceId)
    .eq('status', 'waitlisted')
    .order('waitlist_position', { ascending: true })
    .limit(1)
    .single()

  if (!next) return

  const windowMs = getConfirmationWindow(startsAt)
  const expiresAt = new Date(Date.now() + windowMs).toISOString()
  const token = crypto.randomUUID()

  await supabase.from('bookings').update({
    status: 'pending_confirmation',
    confirmation_token: token,
    confirmation_expires_at: expiresAt,
  }).eq('id', next.id)

  const user = (next as any).users
  const confirmUrl = `${appUrl}/api/bookings/confirm/${token}`
  const expiresIn = windowMs >= TWO_HOURS_MS ? '2 hours' : 'before the class starts'

  const classDate = new Date(startsAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const classTime = new Date(startsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  await sendWaitlistPromotion(user.email, user.name, classDate, classTime, confirmUrl, expiresIn)
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npx vitest run tests/lib/bookings/waitlist.test.ts
```

- [ ] **Step 5: Write booking API route**

```ts
// app/api/bookings/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { promoteNextWaitlistMember } from '@/lib/bookings/waitlist'
import { sendBookingConfirmed, sendBookingCancelled } from '@/lib/email/send'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { instanceId } = await req.json()
  const { data: userData } = await supabase.from('users').select('gym_id, name, email').eq('id', user.id).single()

  // Get instance details
  const { data: instance } = await supabase.from('class_instances')
    .select('*').eq('id', instanceId).single()
  if (!instance) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  // Count confirmed bookings
  const { count } = await supabase.from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('instance_id', instanceId).in('status', ['confirmed', 'pending_confirmation'])

  const isFull = (count ?? 0) >= instance.capacity

  // Count waitlist size
  const { count: waitlistCount } = await supabase.from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('instance_id', instanceId).eq('status', 'waitlisted')

  const maxWaitlist = 10 // TODO: make configurable per gym
  if (isFull && (waitlistCount ?? 0) >= maxWaitlist) {
    return NextResponse.json({ error: 'Waitlist is full' }, { status: 400 })
  }

  const status = isFull ? 'waitlisted' : 'confirmed'
  const waitlist_position = isFull ? (waitlistCount ?? 0) + 1 : null

  const { data: booking, error } = await supabase.from('bookings').insert({
    gym_id: userData!.gym_id,
    instance_id: instanceId,
    user_id: user.id,
    status,
    waitlist_position,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'confirmed') {
    const classDate = new Date(instance.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const classTime = new Date(instance.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    await sendBookingConfirmed(userData!.email, userData!.name, classDate, classTime)
  }

  return NextResponse.json({ booking })
}

export async function DELETE(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId } = await req.json()

  const { data: booking } = await supabase.from('bookings')
    .select('*, class_instances(starts_at, id)')
    .eq('id', bookingId).eq('user_id', user.id).single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const instance = (booking as any).class_instances
  const oneHourBefore = new Date(instance.starts_at).getTime() - 60 * 60 * 1000
  if (Date.now() > oneHourBefore) {
    return NextResponse.json({ error: 'Cannot cancel within 1 hour of class' }, { status: 400 })
  }

  await supabase.from('bookings').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', bookingId)

  const { data: userData } = await supabase.from('users').select('email, name').eq('id', user.id).single()
  const classDate = new Date(instance.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const classTime = new Date(instance.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  await sendBookingCancelled(userData!.email, userData!.name, classDate, classTime)

  await promoteNextWaitlistMember(supabase as any, instance.id, instance.starts_at, process.env.NEXT_PUBLIC_APP_URL!)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 6: Write waitlist confirmation route**

```ts
// app/api/bookings/confirm/[token]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const supabase = createClient()

  const { data: booking } = await supabase.from('bookings')
    .select('*, class_instances(starts_at)')
    .eq('confirmation_token', params.token)
    .eq('status', 'pending_confirmation')
    .single()

  if (!booking) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/this-week?error=invalid-token`)
  }

  if (new Date(booking.confirmation_expires_at!).getTime() < Date.now()) {
    // Expired — pass to next waitlist member
    await supabase.from('bookings').update({ status: 'waitlisted', confirmation_token: null, confirmation_expires_at: null }).eq('id', booking.id)
    const instance = (booking as any).class_instances
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceSupabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { promoteNextWaitlistMember } = await import('@/lib/bookings/waitlist')
    await promoteNextWaitlistMember(serviceSupabase, booking.instance_id, instance.starts_at, process.env.NEXT_PUBLIC_APP_URL!)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/this-week?error=confirmation-expired`)
  }

  await supabase.from('bookings').update({
    status: 'confirmed',
    confirmation_token: null,
    confirmation_expires_at: null,
    waitlist_position: null,
  }).eq('id', booking.id)

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/my-schedule?confirmed=true`)
}
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: booking/cancel API routes with waitlist promotion logic"
```

---

## Task 9: Owner Dashboard — Weekly Program Page

**Files:**
- Create: `app/(owner)/layout.tsx`
- Create: `components/layout/owner-sidebar.tsx`
- Create: `components/workout/workout-card.tsx`
- Create: `components/workout/workout-week-grid.tsx`
- Create: `app/(owner)/dashboard/page.tsx`

- [ ] **Step 1: Write owner sidebar**

```tsx
// components/layout/owner-sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', label: 'Weekly Program' },
  { href: '/style-profile', label: 'Style Profile' },
  { href: '/schedule', label: 'Class Schedule' },
  { href: '/members', label: 'Members' },
  { href: '/settings', label: 'Settings' },
]

export function OwnerSidebar() {
  const path = usePathname()
  return (
    <aside className="w-56 min-h-screen bg-surface border-r border-accent-border flex flex-col">
      <div className="p-6 border-b border-accent-border">
        <h1 className="font-display text-lg text-white">CrossFit HQ</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(item => (
          <Link key={item.href} href={item.href}
            className={cn(
              'block px-3 py-2 rounded-btn text-sm transition-colors',
              path === item.href ? 'bg-accent/10 text-accent' : 'text-secondary hover:text-white'
            )}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Write owner layout**

```tsx
// app/(owner)/layout.tsx
import { OwnerSidebar } from '@/components/layout/owner-sidebar'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <OwnerSidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Write WorkoutCard component**

```tsx
// components/workout/workout-card.tsx
import { Card } from '@/components/ui/card'
import type { WorkoutDay } from '@/lib/types'

export function WorkoutCard({ day }: { day: WorkoutDay }) {
  return (
    <Card className="h-full">
      <div className="mb-3 pb-3 border-b border-accent-border">
        <h3 className="font-display text-white text-lg">{day.day}</h3>
        {day.descriptor && <span className="text-accent text-xs uppercase tracking-widest">{day.descriptor}</span>}
      </div>
      <div className="space-y-4">
        {day.parts.map((part, i) => (
          <div key={i}>
            {part.label && <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-1">{part.label}</p>}
            <pre className="text-white/90 text-sm font-body whitespace-pre-wrap leading-relaxed">{part.content}</pre>
          </div>
        ))}
        {day.parts.length === 0 && <p className="text-secondary text-sm">Rest Day</p>}
      </div>
    </Card>
  )
}
```

- [ ] **Step 4: Write WorkoutWeekGrid**

```tsx
// components/workout/workout-week-grid.tsx
import { WorkoutCard } from './workout-card'
import { Skeleton } from '@/components/ui/skeleton'
import type { WorkoutWeek } from '@/lib/types'

export function WorkoutWeekGrid({ week, loading }: { week: WorkoutWeek | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {Array(5).fill(null).map((_, i) => <Skeleton key={i} className="h-64" />)}
      </div>
    )
  }
  if (!week) return null
  return (
    <div className="grid grid-cols-5 gap-4">
      {week.map((day, i) => <WorkoutCard key={i} day={day} />)}
    </div>
  )
}
```

- [ ] **Step 5: Write Weekly Program dashboard page**

```tsx
// app/(owner)/dashboard/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkoutWeekGrid } from '@/components/workout/workout-week-grid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import type { WorkoutWeek } from '@/lib/types'

function getMondayOfCurrentWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

export default function DashboardPage() {
  const [week, setWeek] = useState<{ id: string; workouts: WorkoutWeek; status: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const weekStart = getMondayOfCurrentWeek()
  const supabase = createClient()

  useEffect(() => { loadWeek() }, [])

  async function loadWeek() {
    setLoading(true)
    const { data } = await supabase.from('workout_weeks')
      .select('id, workouts, status').eq('week_start', weekStart)
      .in('status', ['draft', 'published']).order('created_at', { ascending: false }).limit(1).maybeSingle()
    setWeek(data as any)
    setLoading(false)
  }

  async function handleGenerate() {
    setGenerating(true)
    const res = await fetch('/api/workouts/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart })
    })
    if (res.ok) await loadWeek()
    setGenerating(false)
  }

  async function handleApprove() {
    await fetch('/api/workouts/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: week!.id })
    })
    setShowApproveModal(false)
    await loadWeek()
  }

  async function handleDiscard() {
    await fetch('/api/workouts/discard', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: week!.id })
    })
    await loadWeek()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white">Weekly Program</h1>
          <p className="text-secondary text-sm mt-1">Week of {weekStart}</p>
        </div>
        <div className="flex items-center gap-3">
          {week?.status && <Badge variant={week.status as any} label={week.status.charAt(0).toUpperCase() + week.status.slice(1)} />}
          {week?.status === 'draft' && (
            <>
              <Button variant="danger" onClick={handleDiscard}>Discard</Button>
              <Button onClick={handleGenerate} disabled={generating}>Regenerate</Button>
              <Button onClick={() => setShowApproveModal(true)}>Approve & Publish</Button>
            </>
          )}
          {(!week || week.status === 'published') && (
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating…' : 'Generate This Week'}
            </Button>
          )}
        </div>
      </div>

      <WorkoutWeekGrid week={week?.workouts ?? null} loading={loading || generating} />

      <Modal
        open={showApproveModal}
        title="Publish This Week?"
        description="This will make the workouts visible to all members and send them an email notification."
        confirmLabel="Approve & Publish"
        onConfirm={handleApprove}
        onCancel={() => setShowApproveModal(false)}
      />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: owner dashboard Weekly Program page with generate/approve/discard"
```

---

## Task 10: Owner Dashboard — Style Profile Page

**Files:**
- Create: `app/(owner)/style-profile/page.tsx`
- Create: `app/api/style/route.ts`

- [ ] **Step 1: Write style API routes**

```ts
// app/api/style/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  const { data } = await supabase.from('style_examples').select('*')
    .eq('gym_id', userData!.gym_id).is('archived_at', null).order('created_at')
  return NextResponse.json({ examples: data })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { rawText } = await req.json()
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data } = await supabase.from('style_examples').insert({ gym_id: userData.gym_id, raw_text: rawText }).select().single()
  return NextResponse.json({ example: data })
}

export async function DELETE(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await supabase.from('style_examples').delete().eq('id', id).eq('gym_id', userData.gym_id)
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Write new program API route**

```ts
// app/api/style/new-program/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const now = new Date().toISOString()
  // Soft-delete style examples and workout history
  await supabase.from('style_examples').update({ archived_at: now }).eq('gym_id', userData.gym_id).is('archived_at', null)
  await supabase.from('workout_weeks').update({ archived_at: now }).eq('gym_id', userData.gym_id).is('archived_at', null)
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Write Style Profile page**

```tsx
// app/(owner)/style-profile/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Card } from '@/components/ui/card'

export default function StyleProfilePage() {
  const [examples, setExamples] = useState<{ id: string; raw_text: string }[]>([])
  const [newText, setNewText] = useState('')
  const [showNewProgramModal, setShowNewProgramModal] = useState(false)

  useEffect(() => { loadExamples() }, [])

  async function loadExamples() {
    const res = await fetch('/api/style')
    const data = await res.json()
    setExamples(data.examples ?? [])
  }

  async function handleAdd() {
    if (!newText.trim()) return
    await fetch('/api/style', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawText: newText }) })
    setNewText('')
    await loadExamples()
  }

  async function handleDelete(id: string) {
    await fetch('/api/style', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await loadExamples()
  }

  async function handleNewProgram() {
    await fetch('/api/style/new-program', { method: 'POST' })
    setShowNewProgramModal(false)
    await loadExamples()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-white">Style Profile</h1>
        <Button variant="danger" onClick={() => setShowNewProgramModal(true)}>Start New Program</Button>
      </div>

      <Card className="mb-6">
        <p className="text-secondary text-sm mb-3">Paste a workout example below. Add at least 3 to enable generation.</p>
        <textarea value={newText} onChange={e => setNewText(e.target.value)}
          placeholder="Monday&#10;Part A&#10;Romanian Deadlift&#10;&#10;Part B&#10;500m Row..."
          rows={8}
          className="w-full bg-background border border-accent-border rounded-btn p-3 text-white text-sm font-mono placeholder-secondary focus:outline-none focus:border-accent resize-none"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={handleAdd} disabled={!newText.trim()}>Add Example</Button>
        </div>
      </Card>

      <div className="space-y-3">
        {examples.map((ex, i) => (
          <Card key={ex.id} className="flex items-start gap-4">
            <span className="text-accent font-display text-lg">{i + 1}</span>
            <pre className="flex-1 text-white/80 text-sm whitespace-pre-wrap font-mono">{ex.raw_text}</pre>
            <Button variant="danger" onClick={() => handleDelete(ex.id)}>Remove</Button>
          </Card>
        ))}
        {examples.length === 0 && <p className="text-secondary text-sm">No examples yet. Add at least 3 to enable workout generation.</p>}
      </div>

      <Modal
        open={showNewProgramModal}
        title="Start a New Program?"
        description="This will archive all current style examples and workout history. Future bookings are not affected. You'll need to add new examples before generating again."
        confirmLabel="Start New Program"
        confirmVariant="danger"
        onConfirm={handleNewProgram}
        onCancel={() => setShowNewProgramModal(false)}
      />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: style profile page with add/remove examples and new program flow"
```

---

## Task 11: Member Invite + Members Page

**Files:**
- Create: `app/(owner)/members/page.tsx`
- Create: `app/api/members/invite/route.ts`
- Create: `app/api/members/revoke/route.ts`

- [ ] **Step 1: Write invite API route**

```ts
// app/api/members/invite/route.ts
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendMemberInvite } from '@/lib/email/send'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email } = await req.json()
  const { data: gym } = await supabase.from('gyms').select('name').eq('id', userData.gym_id).single()

  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Create auth user with invite — Supabase sends its own invite email with the magic link.
  // We do NOT call sendMemberInvite separately; Supabase's built-in email handles delivery.
  // To customise the email template, go to Supabase Dashboard → Authentication → Email Templates → Invite.
  const { data: inviteData, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/invite`
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Create user row
  await adminSupabase.from('users').insert({
    id: inviteData.user.id, gym_id: userData.gym_id, email, role: 'member'
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Write revoke API route**

```ts
// app/api/members/revoke/route.ts
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: ownerData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (ownerData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { memberId } = await req.json()
  const now = new Date().toISOString()

  // Get member details before revoking
  const { data: member } = await supabase.from('users').select('email, name').eq('id', memberId).single()

  // Revoke user
  await supabase.from('users').update({ revoked_at: now }).eq('id', memberId).eq('gym_id', ownerData.gym_id)

  // Cancel future bookings
  const { data: futureBookings } = await supabase.from('bookings')
    .select('id, class_instances(starts_at)')
    .eq('user_id', memberId).in('status', ['confirmed', 'waitlisted', 'pending_confirmation'])

  if (futureBookings) {
    for (const b of futureBookings) {
      if (new Date((b as any).class_instances.starts_at) > new Date()) {
        await supabase.from('bookings').update({ status: 'cancelled', cancelled_at: now }).eq('id', b.id)
      }
    }
  }

  // Send revocation email to member
  if (member) {
    await resend.emails.send({
      from: 'noreply@yourgym.com',
      to: member.email,
      subject: 'Your gym access has been removed',
      html: `<p>Hi ${member.name}, your access to the gym has been removed and your upcoming bookings have been cancelled. Please contact your gym owner if you have questions.</p>`
    })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Write Members page**

```tsx
// app/(owner)/members/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Card } from '@/components/ui/card'

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { loadMembers() }, [])

  async function loadMembers() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
    const { data } = await supabase.from('users').select('id, email, name, created_at, revoked_at')
      .eq('gym_id', userData!.gym_id).eq('role', 'member').order('created_at')
    setMembers(data ?? [])
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/members/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) })
    setInviteEmail('')
    await loadMembers()
  }

  async function handleRevoke() {
    await fetch('/api/members/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: revokeTarget }) })
    setRevokeTarget(null)
    await loadMembers()
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">Members</h1>
      <Card className="mb-6">
        <h2 className="text-white font-semibold mb-3">Invite Member</h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            placeholder="member@email.com" required
            className="flex-1 px-3 py-2 bg-background border border-accent-border rounded-btn text-white placeholder-secondary focus:outline-none focus:border-accent"
          />
          <Button type="submit">Send Invite</Button>
        </form>
      </Card>

      <div className="space-y-2">
        {members.map(m => (
          <Card key={m.id} className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">{m.email}</p>
              {m.revoked_at && <p className="text-danger text-xs">Revoked</p>}
            </div>
            {!m.revoked_at && (
              <Button variant="danger" onClick={() => setRevokeTarget(m.id)}>Revoke</Button>
            )}
          </Card>
        ))}
      </div>

      <Modal
        open={!!revokeTarget}
        title="Revoke Member Access?"
        description="This will cancel all their future bookings and they will no longer be able to log in."
        confirmLabel="Revoke Access"
        confirmVariant="danger"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: member invite/revoke pages and API routes"
```

---

## Task 12: Class Schedule (Owner)

**Files:**
- Create: `app/(owner)/schedule/page.tsx`
- Create: `app/api/schedule/templates/route.ts`

- [ ] **Step 1: Write schedule templates API**

```ts
// app/api/schedule/templates/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  const { data } = await supabase.from('class_slot_templates').select('*')
    .eq('gym_id', userData!.gym_id).eq('active', true).order('day_of_week').order('local_time')
  return NextResponse.json({ templates: data })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { dayOfWeek, localTime, capacity } = await req.json()
  const { data } = await supabase.from('class_slot_templates')
    .insert({ gym_id: userData.gym_id, day_of_week: dayOfWeek, local_time: localTime, capacity })
    .select().single()
  return NextResponse.json({ template: data })
}

export async function DELETE(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const { data: userData } = await supabase.from('users').select('gym_id, role').eq('id', user.id).single()
  if (userData?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await supabase.from('class_slot_templates').update({ active: false }).eq('id', id).eq('gym_id', userData.gym_id)
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Write Schedule page**

```tsx
// app/(owner)/schedule/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default function SchedulePage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [form, setForm] = useState({ dayOfWeek: 1, localTime: '06:00', capacity: 20 })

  useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    const res = await fetch('/api/schedule/templates')
    const data = await res.json()
    setTemplates(data.templates ?? [])
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/schedule/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    await loadTemplates()
  }

  async function handleRemove(id: string) {
    await fetch('/api/schedule/templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await loadTemplates()
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">Class Schedule</h1>
      <Card className="mb-6">
        <h2 className="text-white font-semibold mb-3">Add Class Time</h2>
        <form onSubmit={handleAdd} className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-secondary text-xs mb-1 block">Day</label>
            <select value={form.dayOfWeek} onChange={e => setForm(f => ({...f, dayOfWeek: +e.target.value}))}
              className="px-3 py-2 bg-background border border-accent-border rounded-btn text-white focus:outline-none focus:border-accent">
              {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-secondary text-xs mb-1 block">Time</label>
            <input type="time" value={form.localTime} onChange={e => setForm(f => ({...f, localTime: e.target.value}))}
              className="px-3 py-2 bg-background border border-accent-border rounded-btn text-white focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-secondary text-xs mb-1 block">Capacity</label>
            <input type="number" min={1} max={100} value={form.capacity} onChange={e => setForm(f => ({...f, capacity: +e.target.value}))}
              className="w-20 px-3 py-2 bg-background border border-accent-border rounded-btn text-white focus:outline-none focus:border-accent" />
          </div>
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <div className="space-y-2">
        {templates.map(t => (
          <Card key={t.id} className="flex items-center justify-between">
            <span className="text-white text-sm">{DAYS[t.day_of_week - 1]} at {t.local_time} — {t.capacity} spots</span>
            <Button variant="danger" onClick={() => handleRemove(t.id)}>Remove</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: class schedule template management page"
```

---

## Task 13: Member Dashboard — This Week + Booking

**Files:**
- Create: `app/(member)/layout.tsx`
- Create: `components/layout/member-nav.tsx`
- Create: `components/booking/class-slot.tsx`
- Create: `app/(member)/this-week/page.tsx`

- [ ] **Step 1: Write member nav**

```tsx
// components/layout/member-nav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const nav = [
  { href: '/this-week', label: 'This Week' },
  { href: '/my-schedule', label: 'My Schedule' },
  { href: '/profile', label: 'Profile' },
]

export function MemberNav() {
  const path = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="border-b border-accent-border bg-surface px-8 py-4 flex items-center justify-between">
      <h1 className="font-display text-lg text-white">CrossFit HQ</h1>
      <div className="flex items-center gap-6">
        {nav.map(item => (
          <Link key={item.href} href={item.href}
            className={cn('text-sm transition-colors', path === item.href ? 'text-accent' : 'text-secondary hover:text-white')}>
            {item.label}
          </Link>
        ))}
        <button onClick={signOut} className="text-secondary text-sm hover:text-white">Sign Out</button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Write member layout**

```tsx
// app/(member)/layout.tsx
import { MemberNav } from '@/components/layout/member-nav'

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <MemberNav />
      <main className="p-8 max-w-7xl mx-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Write ClassSlot component**

```tsx
// components/booking/class-slot.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ClassSlotProps {
  instance: { id: string; local_time: string; starts_at: string; capacity: number }
  confirmedCount: number
  userBooking: { id: string; status: string } | null
  onRefresh: () => void
}

export function ClassSlot({ instance, confirmedCount, userBooking, onRefresh }: ClassSlotProps) {
  const [loading, setLoading] = useState(false)
  const spotsLeft = instance.capacity - confirmedCount
  const isFull = spotsLeft <= 0
  const displayTime = new Date(`1970-01-01T${instance.local_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  async function handleBook() {
    setLoading(true)
    await fetch('/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId: instance.id })
    })
    setLoading(false)
    onRefresh()
  }

  async function handleCancel() {
    setLoading(true)
    await fetch('/api/bookings', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: userBooking!.id })
    })
    setLoading(false)
    onRefresh()
  }

  return (
    <div className="flex items-center justify-between py-2 border-t border-accent-border/50 first:border-t-0">
      <div className="flex items-center gap-3">
        <span className="text-white text-sm font-medium">{displayTime}</span>
        <span className="text-secondary text-xs">{isFull ? 'Full' : `${spotsLeft} of ${instance.capacity} remaining`}</span>
        {userBooking && <Badge variant={userBooking.status as any} label={userBooking.status === 'pending_confirmation' ? 'Confirming' : userBooking.status} />}
      </div>
      {!userBooking && (
        <Button onClick={handleBook} disabled={loading}>
          {isFull ? 'Join Waitlist' : 'Book'}
        </Button>
      )}
      {userBooking && userBooking.status !== 'cancelled' && (
        <Button variant="danger" onClick={handleCancel} disabled={loading}>Cancel</Button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write This Week page**

```tsx
// app/(member)/this-week/page.tsx
import { createClient } from '@/lib/supabase/server'
import { WorkoutCard } from '@/components/workout/workout-card'
import { ClassSlot } from '@/components/booking/class-slot'
import { Card } from '@/components/ui/card'
import type { WorkoutDay } from '@/lib/types'

function getMondayOfCurrentWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday']

export default async function ThisWeekPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase.from('users').select('gym_id, id').eq('id', user.id).single()
  const weekStart = getMondayOfCurrentWeek()

  const { data: weekData } = await supabase.from('workout_weeks').select('workouts')
    .eq('gym_id', userData!.gym_id).eq('status', 'published').is('archived_at', null)
    .eq('week_start', weekStart).maybeSingle()

  const workouts: WorkoutDay[] = weekData?.workouts ?? []

  // Get all class instances for this week
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 4)
  const { data: instances } = await supabase.from('class_instances').select('*')
    .eq('gym_id', userData!.gym_id)
    .gte('date', weekStart).lte('date', weekEnd.toISOString().split('T')[0])
    .order('date').order('local_time')

  // Get user's bookings for this week
  const instanceIds = (instances ?? []).map(i => i.id)
  const { data: userBookings } = await supabase.from('bookings').select('*')
    .eq('user_id', user.id).in('instance_id', instanceIds)

  // Get booking counts per instance
  const { data: allBookings } = await supabase.from('bookings').select('instance_id, status')
    .in('instance_id', instanceIds).in('status', ['confirmed', 'pending_confirmation'])

  const bookingCounts: Record<string, number> = {}
  for (const b of allBookings ?? []) {
    bookingCounts[b.instance_id] = (bookingCounts[b.instance_id] ?? 0) + 1
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">This Week</h1>
      {workouts.length === 0 ? (
        <p className="text-secondary">No workouts published yet for this week.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {DAY_NAMES.map((dayName, i) => {
            const workout = workouts.find(w => w.day === dayName)
            const dayDate = new Date(weekStart)
            dayDate.setDate(dayDate.getDate() + i)
            const dateStr = dayDate.toISOString().split('T')[0]
            const dayInstances = (instances ?? []).filter(inst => inst.date === dateStr)

            return (
              <div key={dayName} className="flex flex-col gap-3">
                {workout && <WorkoutCard day={workout} />}
                {dayInstances.length > 0 && (
                  <Card>
                    <p className="text-secondary text-xs uppercase tracking-wider mb-2">Classes</p>
                    {dayInstances.map(inst => (
                      <ClassSlot
                        key={inst.id}
                        instance={inst}
                        confirmedCount={bookingCounts[inst.id] ?? 0}
                        userBooking={(userBookings ?? []).find(b => b.instance_id === inst.id) ?? null}
                        onRefresh={() => window.location.reload()}
                      />
                    ))}
                  </Card>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: member This Week page with workout display and class booking"
```

---

## Task 14: Member — My Schedule Page

**Files:**
- Create: `app/(member)/my-schedule/page.tsx`

- [ ] **Step 1: Write My Schedule page**

```tsx
// app/(member)/my-schedule/page.tsx
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function MySchedulePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: bookings } = await supabase.from('bookings')
    .select('*, class_instances(date, local_time, starts_at)')
    .eq('user_id', user.id)
    .in('status', ['confirmed', 'waitlisted', 'pending_confirmation'])
    .gte('class_instances.date', new Date().toISOString().split('T')[0])
    .order('class_instances(starts_at)', { ascending: true })

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">My Schedule</h1>
      {!bookings || bookings.length === 0 ? (
        <p className="text-secondary">No upcoming bookings.</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => {
            const inst = b.class_instances
            const date = new Date(inst.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            const time = new Date(`1970-01-01T${inst.local_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            return (
              <Card key={b.id} className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{date}</p>
                  <p className="text-secondary text-sm">{time}</p>
                </div>
                <Badge variant={b.status} label={b.status === 'pending_confirmation' ? 'Confirm Spot' : b.status} />
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: member My Schedule page"
```

---

## Task 15: Supabase Edge Functions (Cron Jobs)

**Files:**
- Create: `supabase/functions/_shared/waitlist.ts`
- Create: `supabase/functions/generate-class-instances/index.ts`
- Create: `supabase/functions/process-waitlist-expiry/index.ts`

- [ ] **Step 1: Write Deno-compatible shared waitlist logic**

This is a Deno rewrite of `lib/bookings/waitlist.ts` — it cannot import Node.js modules, so it must be self-contained.

```ts
// supabase/functions/_shared/waitlist.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

export function shouldSkipPromotion(startsAt: string): boolean {
  return new Date(startsAt).getTime() - Date.now() <= TWO_HOURS_MS
}

export function getConfirmationWindow(startsAt: string): number {
  const timeUntilClass = new Date(startsAt).getTime() - Date.now()
  return Math.min(TWO_HOURS_MS, timeUntilClass)
}

export async function promoteNextWaitlistMember(
  supabase: ReturnType<typeof createClient>,
  instanceId: string,
  startsAt: string,
  appUrl: string,
  resendApiKey: string
) {
  if (shouldSkipPromotion(startsAt)) return

  const { data: next } = await supabase
    .from('bookings')
    .select('id, user_id, users(email, name)')
    .eq('instance_id', instanceId)
    .eq('status', 'waitlisted')
    .order('waitlist_position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!next) return

  const windowMs = getConfirmationWindow(startsAt)
  const expiresAt = new Date(Date.now() + windowMs).toISOString()
  const token = crypto.randomUUID()

  await supabase.from('bookings').update({
    status: 'pending_confirmation',
    confirmation_token: token,
    confirmation_expires_at: expiresAt,
  }).eq('id', next.id)

  const user = (next as any).users
  const confirmUrl = `${appUrl}/api/bookings/confirm/${token}`
  const expiresIn = windowMs >= TWO_HOURS_MS ? '2 hours' : 'before the class starts'
  const classDate = new Date(startsAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const classTime = new Date(startsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'noreply@yourgym.com',
      to: user.email,
      subject: 'Spot Available — Confirm Now',
      html: `<p>Hi ${user.name}, a spot opened for <strong>${classDate}</strong> at <strong>${classTime}</strong>. Confirm within ${expiresIn}: <a href="${confirmUrl}">Confirm My Spot</a></p>`
    })
  })
}
```

- [ ] **Step 2: Write class instance generator**

The date math: for each template, find the upcoming calendar date matching `day_of_week` (1=Mon…7=Sun) for weeks 0–3 ahead. Use a clean loop — find the next occurrence from today, then add `weekOffset * 7` days.

```ts
// supabase/functions/generate-class-instances/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

/** Returns the Date of the next (or current) occurrence of isoWeekday (1=Mon…7=Sun) on or after fromDate */
function nextOccurrence(fromDate: Date, isoWeekday: number): Date {
  const result = new Date(fromDate)
  result.setHours(0, 0, 0, 0)
  // JS getDay(): 0=Sun,1=Mon…6=Sat → convert to ISO: Mon=1…Sun=7
  const jsDay = result.getDay() === 0 ? 7 : result.getDay()
  const diff = (isoWeekday - jsDay + 7) % 7
  result.setDate(result.getDate() + diff)
  return result
}

Deno.serve(async () => {
  const { data: gyms } = await supabase.from('gyms').select('id, timezone')

  for (const gym of gyms ?? []) {
    const { data: templates } = await supabase.from('class_slot_templates')
      .select('*').eq('gym_id', gym.id).eq('active', true)

    for (const template of templates ?? []) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const firstOccurrence = nextOccurrence(today, template.day_of_week)

      for (let weekOffset = 0; weekOffset <= 3; weekOffset++) {
        const targetDate = new Date(firstOccurrence)
        targetDate.setDate(targetDate.getDate() + weekOffset * 7)
        const dateStr = targetDate.toISOString().split('T')[0]

        // Skip if already exists
        const { data: existing } = await supabase.from('class_instances')
          .select('id').eq('template_id', template.id).eq('date', dateStr).maybeSingle()
        if (existing) continue

        // Compute starts_at UTC: combine date + local_time, then treat as gym local
        // Note: use a timezone library (e.g. date-fns-tz via esm.sh) for full DST accuracy in production
        const startsAt = new Date(`${dateStr}T${template.local_time}:00`)

        await supabase.from('class_instances').insert({
          gym_id: gym.id,
          template_id: template.id,
          date: dateStr,
          local_time: template.local_time,
          starts_at: startsAt.toISOString(),
          capacity: template.capacity,
        })
      }
    }
  }

  return new Response('Done', { status: 200 })
})
```

- [ ] **Step 3: Write waitlist expiry processor**

```ts
// supabase/functions/process-waitlist-expiry/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { promoteNextWaitlistMember } from '../_shared/waitlist.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const { data: expired } = await supabase.from('bookings')
    .select('id, instance_id, class_instances(starts_at, id)')
    .eq('status', 'pending_confirmation')
    .lt('confirmation_expires_at', new Date().toISOString())

  for (const booking of expired ?? []) {
    await supabase.from('bookings').update({
      status: 'waitlisted',
      confirmation_token: null,
      confirmation_expires_at: null,
    }).eq('id', booking.id)

    const instance = (booking as any).class_instances
    const appUrl = Deno.env.get('APP_URL') ?? ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
    await promoteNextWaitlistMember(supabase, instance.id, instance.starts_at, appUrl, resendApiKey)
  }

  return new Response('Done', { status: 200 })
})
```

- [ ] **Step 3: Configure cron schedules in `supabase/config.toml`**

Add under `[functions]` section:
```toml
[functions.generate-class-instances]
schedule = "0 2 * * *"  # 2am UTC daily

[functions.process-waitlist-expiry]
schedule = "*/15 * * * *"  # every 15 minutes
```

- [ ] **Step 4: Deploy edge functions**

```bash
supabase functions deploy generate-class-instances
supabase functions deploy process-waitlist-expiry
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: edge function cron jobs for class instance generation and waitlist expiry"
```

---

## Task 16: Settings Page + Final Polish

**Files:**
- Create: `app/(owner)/settings/page.tsx`
- Create: `app/(member)/profile/page.tsx`

- [ ] **Step 1: Write Settings page**

```tsx
// app/(owner)/settings/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const TIMEZONES = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Australia/Sydney']

export default function SettingsPage() {
  const [gym, setGym] = useState<{ name: string; timezone: string } | null>(null)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
      const { data } = await supabase.from('gyms').select('name, timezone').eq('id', userData!.gym_id).single()
      setGym(data)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !gym) return
    const { data: userData } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
    await supabase.from('gyms').update({ name: gym.name, timezone: gym.timezone }).eq('id', userData!.gym_id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!gym) return null

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">Settings</h1>
      <Card className="max-w-md">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-secondary text-xs mb-1 block">Gym Name</label>
            <input value={gym.name} onChange={e => setGym(g => g ? {...g, name: e.target.value} : g)}
              className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-secondary text-xs mb-1 block">Timezone</label>
            <select value={gym.timezone} onChange={e => setGym(g => g ? {...g, timezone: e.target.value} : g)}
              className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white focus:outline-none focus:border-accent">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <Button type="submit">{saved ? 'Saved!' : 'Save Changes'}</Button>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Write Profile page**

```tsx
// app/(member)/profile/page.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function ProfilePage() {
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    await supabase.auth.updateUser({ password })
    setPassword('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">Profile</h1>
      <Card className="max-w-md">
        <h2 className="text-white font-semibold mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="New password" minLength={8} required
            className="w-full px-3 py-2 bg-background border border-accent-border rounded-btn text-white placeholder-secondary focus:outline-none focus:border-accent"
          />
          <Button type="submit">{saved ? 'Updated!' : 'Update Password'}</Button>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Add global CSS shimmer animation**

In `app/globals.css`, add:
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.animate-pulse {
  background: linear-gradient(90deg, #141414 25%, #1f1f1f 50%, #141414 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

- [ ] **Step 4: Final build check**

```bash
npm run build
```
Expected: Build completes with no type errors.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 6: Final commit**

```bash
git add -A && git commit -m "feat: settings, profile pages, shimmer animation, final build pass"
```

---

## Task 17: Vercel Deployment

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

- [ ] **Step 2: Connect to Vercel**

1. Go to vercel.com → New Project → Import your GitHub repo
2. Set framework preset: Next.js
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `RESEND_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)

- [ ] **Step 3: Set Supabase project URL in invite redirect**

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: your Vercel URL
- Redirect URLs: `https://your-app.vercel.app/invite`

- [ ] **Step 4: Run migrations against production Supabase**

```bash
supabase db push --db-url <production-db-url>
```

- [ ] **Step 5: Deploy edge functions to production**

```bash
supabase functions deploy generate-class-instances --project-ref <your-project-ref>
supabase functions deploy process-waitlist-expiry --project-ref <your-project-ref>
```

- [ ] **Step 6: Smoke test production**

1. Sign up as gym owner
2. Add 3 style examples
3. Generate a week → approve
4. Invite a member (different email)
5. Log in as member → view workouts → book a class
6. Verify confirmation email received
