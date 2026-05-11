# Other Programs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let gym owners create and publish specialty programs (Running, Hyrox, Weightlifting, etc.) that members can read on the "This Week" page — no booking, no AI, purely informational.

**Architecture:** New `specialty_programs` Supabase table with RLS. Owner CRUD via a new `/programs` section in the owner area. The member "This Week" page (a server component) adds a direct Supabase query for published programs and renders them as collapsible day cards below the main schedule. All owner pages are client components following the existing pattern.

**Tech Stack:** Next.js 16 App Router, Supabase, Tailwind CSS, existing auth helpers (`requireOwnerAuth`, `requireMemberAuth`), existing response utilities (`jsonOk`, `jsonError`, `jsonServerError`, `parseBody`).

---

## File Map

**Create:**
- `supabase/migrations/018_specialty_programs.sql`
- `app/api/programs/route.ts`
- `app/api/programs/[id]/route.ts`
- `app/api/programs/[id]/publish/route.ts`
- `app/api/programs/published/route.ts`
- `app/(owner)/programs/page.tsx`
- `app/(owner)/programs/loading.tsx`
- `app/(owner)/programs/error.tsx`
- `app/(owner)/programs/[id]/page.tsx`
- `app/(owner)/programs/[id]/loading.tsx`
- `app/(owner)/programs/[id]/error.tsx`

**Modify:**
- `lib/types.ts` — add `ProgramDay`, `SpecialtyProgram`
- `components/layout/owner-sidebar.tsx` — add Programs nav item + IconGrid
- `app/(member)/this-week/page.tsx` — add published programs section

---

### Task 1: Migration + Types

**Files:**
- Create: `supabase/migrations/018_specialty_programs.sql`
- Modify: `lib/types.ts`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/018_specialty_programs.sql`:

```sql
create table specialty_programs (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references gyms(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  week_start  date not null,
  days        jsonb not null default '[]',
  status      text not null default 'draft' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(gym_id, name, week_start)
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger specialty_programs_updated_at
  before update on specialty_programs
  for each row execute procedure set_updated_at();

alter table specialty_programs enable row level security;

create policy "owners manage own gym programs"
  on specialty_programs for all
  using (gym_id = (select gym_id from gym_members where user_id = auth.uid() and role = 'owner'))
  with check (gym_id = (select gym_id from gym_members where user_id = auth.uid() and role = 'owner'));

create policy "members read published programs"
  on specialty_programs for select
  using (
    status = 'published'
    and gym_id = (select gym_id from gym_members where user_id = auth.uid())
  );

create index on specialty_programs(gym_id, week_start, status);
```

- [ ] **Step 2: Apply migration**

Paste into the Supabase dashboard SQL editor and run it. Or via CLI:
```bash
supabase db push
```

Expected: Table `specialty_programs` appears with RLS enabled.

- [ ] **Step 3: Add types to `lib/types.ts`**

Append to the end of `lib/types.ts`:

```ts
export interface ProgramDay {
  day: string
  content: string
}

export interface SpecialtyProgram {
  id: string
  gym_id: string
  name: string
  week_start: string
  days: ProgramDay[]
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/018_specialty_programs.sql lib/types.ts
git commit -m "feat(programs): add specialty_programs migration and types"
```

---

### Task 2: API — List & Create

**Files:**
- Create: `app/api/programs/route.ts`

- [ ] **Step 1: Create `app/api/programs/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { z } from '@/lib/validation/z'
import { parseBody, jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { data, error } = await supabase
    .from('specialty_programs')
    .select('*')
    .eq('gym_id', userData.gym_id)
    .order('week_start', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return jsonServerError('programs GET', error)
  return jsonOk({ programs: data ?? [] })
}

const postSchema = z.object({
  name: z.string({ min: 1, max: 80, trim: true }),
  weekStart: z.string({ min: 10, max: 10 }),
})

export async function POST(req: Request) {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const parsed = await parseBody(req, postSchema)
  if (parsed instanceof NextResponse) return parsed

  if (!DATE_RE.test(parsed.weekStart)) return jsonError('weekStart must be YYYY-MM-DD', 400)

  const emptyDays = DAYS.map(day => ({ day, content: '' }))

  const { data, error } = await supabase
    .from('specialty_programs')
    .insert({
      gym_id: userData.gym_id,
      name: parsed.name,
      week_start: parsed.weekStart,
      days: emptyDays,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return jsonError('A program with this name already exists for that week', 409)
    return jsonServerError('programs POST', error)
  }
  return jsonOk({ program: data })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/programs/route.ts"
git commit -m "feat(programs): add GET/POST /api/programs"
```

---

### Task 3: API — Single Program CRUD

**Files:**
- Create: `app/api/programs/[id]/route.ts`

- [ ] **Step 1: Create `app/api/programs/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { z } from '@/lib/validation/z'
import { parseBody, jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_RE.test(id)) return jsonError('Invalid program id', 400)

  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { data, error } = await supabase
    .from('specialty_programs')
    .select('*')
    .eq('id', id)
    .eq('gym_id', userData.gym_id)
    .single()

  if (error || !data) return jsonError('Program not found', 404)
  return jsonOk({ program: data })
}

const patchSchema = z.object({
  name: z.string({ min: 1, max: 80, trim: true }).optional(),
  days: z.array(z.object({ day: z.string(), content: z.string() })).optional(),
})

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_RE.test(id)) return jsonError('Invalid program id', 400)

  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const parsed = await parseBody(req, patchSchema)
  if (parsed instanceof NextResponse) return parsed

  if (parsed.days !== undefined) {
    const { data: current } = await supabase
      .from('specialty_programs')
      .select('status')
      .eq('id', id)
      .eq('gym_id', userData.gym_id)
      .single()
    if (!current) return jsonError('Program not found', 404)
    if (current.status === 'published') {
      return jsonError('Published programs cannot be edited. Unpublish first.', 409)
    }
  }

  const updates: Record<string, unknown> = {}
  if (parsed.name !== undefined) updates.name = parsed.name
  if (parsed.days !== undefined) updates.days = parsed.days

  const { data, error } = await supabase
    .from('specialty_programs')
    .update(updates)
    .eq('id', id)
    .eq('gym_id', userData.gym_id)
    .select()
    .single()

  if (error || !data) return jsonServerError('programs/[id] PATCH', error)
  return jsonOk({ program: data })
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_RE.test(id)) return jsonError('Invalid program id', 400)

  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { error } = await supabase
    .from('specialty_programs')
    .delete()
    .eq('id', id)
    .eq('gym_id', userData.gym_id)

  if (error) return jsonServerError('programs/[id] DELETE', error)
  return jsonOk({ success: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/programs/[id]/route.ts"
git commit -m "feat(programs): add GET/PATCH/DELETE /api/programs/[id]"
```

---

### Task 4: API — Publish / Unpublish

**Files:**
- Create: `app/api/programs/[id]/publish/route.ts`

- [ ] **Step 1: Create `app/api/programs/[id]/publish/route.ts`**

```ts
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_RE.test(id)) return jsonError('Invalid program id', 400)

  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { data, error } = await supabase
    .from('specialty_programs')
    .update({ status: 'published' })
    .eq('id', id)
    .eq('gym_id', userData.gym_id)
    .select()
    .single()

  if (error || !data) return jsonServerError('programs/[id]/publish POST', error)
  return jsonOk({ program: data })
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_RE.test(id)) return jsonError('Invalid program id', 400)

  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { data, error } = await supabase
    .from('specialty_programs')
    .update({ status: 'draft' })
    .eq('id', id)
    .eq('gym_id', userData.gym_id)
    .select()
    .single()

  if (error || !data) return jsonServerError('programs/[id]/publish DELETE', error)
  return jsonOk({ program: data })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/programs/[id]/publish/route.ts"
git commit -m "feat(programs): add publish/unpublish API"
```

---

### Task 5: API — Published Programs (Member-facing)

**Files:**
- Create: `app/api/programs/published/route.ts`

- [ ] **Step 1: Create `app/api/programs/published/route.ts`**

```ts
import { requireMemberAuth, isNextResponse } from '@/lib/auth-helpers'
import { jsonOk, jsonError, jsonServerError } from '@/lib/api/response'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(req: Request) {
  const auth = await requireMemberAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('weekStart')
  if (!weekStart || !DATE_RE.test(weekStart)) {
    return jsonError('weekStart query param is required and must be YYYY-MM-DD', 400)
  }

  const { data, error } = await supabase
    .from('specialty_programs')
    .select('*')
    .eq('gym_id', userData.gym_id)
    .eq('week_start', weekStart)
    .eq('status', 'published')
    .order('name', { ascending: true })

  if (error) return jsonServerError('programs/published GET', error)
  return jsonOk({ programs: data ?? [] })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/programs/published/route.ts"
git commit -m "feat(programs): add published programs member API"
```

---

### Task 6: Owner Sidebar — Programs Nav Item

**Files:**
- Modify: `components/layout/owner-sidebar.tsx`

- [ ] **Step 1: Add `IconGrid` after `IconClock`**

In `components/layout/owner-sidebar.tsx`, after the closing brace of `IconClock`, add:

```ts
function IconGrid() {
  return (
    <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
```

- [ ] **Step 2: Add Programs to the nav array**

Find:
```ts
const nav = [
  { href: '/dashboard',     label: 'Weekly Program', Icon: IconCalendar },
  { href: '/style-profile', label: 'Style Profile',  Icon: IconSparkle  },
  { href: '/schedule',      label: 'Class Schedule', Icon: IconClock    },
  { href: '/members',       label: 'Members',        Icon: IconUsers    },
  { href: '/settings',      label: 'Settings',       Icon: IconSettings },
]
```

Replace with:
```ts
const nav = [
  { href: '/dashboard',     label: 'Weekly Program', Icon: IconCalendar },
  { href: '/style-profile', label: 'Style Profile',  Icon: IconSparkle  },
  { href: '/schedule',      label: 'Class Schedule', Icon: IconClock    },
  { href: '/programs',      label: 'Programs',       Icon: IconGrid     },
  { href: '/members',       label: 'Members',        Icon: IconUsers    },
  { href: '/settings',      label: 'Settings',       Icon: IconSettings },
]
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add components/layout/owner-sidebar.tsx
git commit -m "feat(programs): add Programs nav item to owner sidebar"
```

---

### Task 7: Programs List Page (Owner)

**Files:**
- Create: `app/(owner)/programs/error.tsx`
- Create: `app/(owner)/programs/loading.tsx`
- Create: `app/(owner)/programs/page.tsx`

- [ ] **Step 1: Create `app/(owner)/programs/error.tsx`**

```tsx
'use client'
import { RouteError } from '@/components/ui/route-error'
export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} />
}
```

- [ ] **Step 2: Create `app/(owner)/programs/loading.tsx`**

```tsx
export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-36 bg-surface border border-border rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-surface border border-border rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-surface border border-border rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-surface border border-border rounded-card animate-pulse" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(owner)/programs/page.tsx`**

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import type { SpecialtyProgram } from '@/lib/types'

function getMondayOfCurrentWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<SpecialtyProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newWeek, setNewWeek] = useState(getMondayOfCurrentWeek())
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const loadPrograms = useCallback(async () => {
    const res = await fetch('/api/programs')
    if (res.ok) {
      const data = await res.json() as { programs: SpecialtyProgram[] }
      setPrograms(data.programs)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadPrograms() }, [loadPrograms])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!newName.trim()) { setFormError('Name is required'); return }
    setCreating(true)
    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), weekStart: newWeek }),
    })
    if (res.ok) {
      const data = await res.json() as { program: SpecialtyProgram }
      router.push(`/programs/${data.program.id}`)
    } else {
      const data = await res.json() as { error?: string }
      setFormError(data.error ?? 'Failed to create program')
      setCreating(false)
    }
  }

  async function handlePublishToggle(program: SpecialtyProgram) {
    const method = program.status === 'published' ? 'DELETE' : 'POST'
    const res = await fetch(`/api/programs/${program.id}/publish`, { method })
    if (res.ok) {
      const data = await res.json() as { program: SpecialtyProgram }
      setPrograms(prev => prev.map(p => p.id === program.id ? data.program : p))
    } else {
      toast('Failed to update program status', 'error')
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPrograms(prev => prev.filter(p => p.id !== id))
      setConfirmDelete(null)
    } else {
      toast('Failed to delete program', 'error')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-foreground">Programs</h1>
          <p className="text-secondary text-sm mt-1">Specialty programs published to your members.</p>
        </div>
        <button
          onClick={() => { setShowForm(f => !f); setFormError('') }}
          className="inline-flex items-center px-4 py-2 rounded-btn text-sm font-medium bg-accent text-background hover:bg-accent/90 transition-all"
        >
          {showForm ? 'Cancel' : 'New Program'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-surface border border-border rounded-card flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs text-secondary uppercase tracking-wide">Program name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Running, Hyrox, Weightlifting"
              className="bg-background border border-border rounded-btn px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary uppercase tracking-wide">Week starting</label>
            <input
              type="date"
              value={newWeek}
              onChange={e => setNewWeek(e.target.value)}
              className="bg-background border border-border rounded-btn px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            {formError && <span className="text-danger text-xs">{formError}</span>}
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-btn text-sm font-medium bg-accent text-background hover:bg-accent/90 disabled:opacity-50 transition-all"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-16 bg-surface border border-border rounded-card animate-pulse" />)}
        </div>
      ) : programs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-foreground font-medium mb-1">No programs yet</p>
          <p className="text-secondary text-sm">Create your first specialty program above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {programs.map(program => (
            <div key={program.id} className="flex items-center gap-3 bg-surface border border-border rounded-card px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{program.name}</p>
                <p className="text-secondary text-xs">Week of {program.week_start}</p>
              </div>
              <Badge variant={program.status as 'draft' | 'published'} label={program.status.charAt(0).toUpperCase() + program.status.slice(1)} />
              <Link
                href={`/programs/${program.id}`}
                className="text-xs text-secondary hover:text-foreground border border-border hover:border-accent rounded px-2 py-1 transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={() => handlePublishToggle(program)}
                className="text-xs text-secondary hover:text-foreground border border-border hover:border-accent rounded px-2 py-1 transition-colors"
              >
                {program.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
              {confirmDelete === program.id ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-secondary">Delete?</span>
                  <button onClick={() => handleDelete(program.id)} className="text-danger font-semibold">Yes</button>
                  <button onClick={() => setConfirmDelete(null)} className="text-secondary">No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(program.id)}
                  className="text-xs text-danger hover:text-foreground border border-border hover:border-danger rounded px-2 py-1 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(owner)/programs/page.tsx" "app/(owner)/programs/loading.tsx" "app/(owner)/programs/error.tsx"
git commit -m "feat(programs): add programs list page for owners"
```

---

### Task 8: Program Editor Page (Owner)

**Files:**
- Create: `app/(owner)/programs/[id]/error.tsx`
- Create: `app/(owner)/programs/[id]/loading.tsx`
- Create: `app/(owner)/programs/[id]/page.tsx`

- [ ] **Step 1: Create `app/(owner)/programs/[id]/error.tsx`**

```tsx
'use client'
import { RouteError } from '@/components/ui/route-error'
export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} />
}
```

- [ ] **Step 2: Create `app/(owner)/programs/[id]/loading.tsx`**

```tsx
export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-surface border border-border rounded animate-pulse" />
          <div className="h-8 w-48 bg-surface border border-border rounded animate-pulse" />
          <div className="h-4 w-32 bg-surface border border-border rounded animate-pulse" />
        </div>
        <div className="h-9 w-24 bg-surface border border-border rounded animate-pulse" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="h-28 bg-surface border border-border rounded-card animate-pulse" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(owner)/programs/[id]/page.tsx`**

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import type { SpecialtyProgram, ProgramDay } from '@/lib/types'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function ProgramEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [program, setProgram] = useState<SpecialtyProgram | null>(null)
  const [localDays, setLocalDays] = useState<ProgramDay[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [publishing, setPublishing] = useState(false)
  const { toast } = useToast()

  useEffect(() => { params.then(p => setId(p.id)) }, [params])

  const loadProgram = useCallback(async (programId: string) => {
    const res = await fetch(`/api/programs/${programId}`)
    if (res.ok) {
      const data = await res.json() as { program: SpecialtyProgram }
      setProgram(data.program)
      setNameValue(data.program.name)
      const filled = DAYS.map(dayName => {
        const existing = data.program.days.find(d => d.day === dayName)
        return existing ?? { day: dayName, content: '' }
      })
      setLocalDays(filled)
    }
    setLoading(false)
  }, [])

  useEffect(() => { if (id) loadProgram(id) }, [id, loadProgram])

  async function saveName() {
    if (!program || !nameValue.trim()) { setEditingName(false); setNameValue(program?.name ?? ''); return }
    if (nameValue === program.name) { setEditingName(false); return }
    const res = await fetch(`/api/programs/${program.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameValue.trim() }),
    })
    if (res.ok) {
      const data = await res.json() as { program: SpecialtyProgram }
      setProgram(data.program)
      setNameValue(data.program.name)
    } else {
      toast('Failed to save name', 'error')
      setNameValue(program.name)
    }
    setEditingName(false)
  }

  async function saveDayContent(day: string, content: string) {
    if (!program) return
    const updatedDays = localDays.map(d => d.day === day ? { ...d, content } : d)
    const res = await fetch(`/api/programs/${program.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: updatedDays }),
    })
    if (res.ok) {
      const data = await res.json() as { program: SpecialtyProgram }
      setProgram(data.program)
    } else {
      const data = await res.json() as { error?: string }
      toast(data.error ?? 'Failed to save', 'error')
    }
  }

  async function handlePublishToggle() {
    if (!program || publishing) return
    setPublishing(true)
    const method = program.status === 'published' ? 'DELETE' : 'POST'
    const res = await fetch(`/api/programs/${program.id}/publish`, { method })
    if (res.ok) {
      const data = await res.json() as { program: SpecialtyProgram }
      setProgram(data.program)
    } else {
      toast('Failed to update status', 'error')
    }
    setPublishing(false)
  }

  if (loading) return null
  if (!program) return <p className="text-secondary text-sm">Program not found.</p>

  const isPublished = program.status === 'published'

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/programs" className="text-xs text-secondary hover:text-foreground transition-colors mb-2 inline-block">
            ← Programs
          </Link>
          {editingName ? (
            <input
              autoFocus
              type="text"
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') { setEditingName(false); setNameValue(program.name) }
              }}
              className="font-display text-3xl text-foreground bg-transparent border-b border-accent focus:outline-none w-full max-w-sm"
            />
          ) : (
            <h1
              className={`font-display text-3xl text-foreground ${!isPublished ? 'cursor-text hover:opacity-70' : ''} transition-opacity`}
              onClick={() => { if (!isPublished) setEditingName(true) }}
              title={isPublished ? undefined : 'Click to edit name'}
            >
              {program.name}
            </h1>
          )}
          <p className="text-secondary text-sm mt-1">Week of {program.week_start}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={program.status as 'draft' | 'published'} label={program.status.charAt(0).toUpperCase() + program.status.slice(1)} />
          <button
            onClick={handlePublishToggle}
            disabled={publishing}
            className="inline-flex items-center px-4 py-2 rounded-btn text-sm font-medium bg-accent text-background hover:bg-accent/90 disabled:opacity-50 transition-all"
          >
            {publishing ? 'Saving…' : isPublished ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {isPublished && (
        <div className="mb-6 px-4 py-3 bg-accent-5 border border-accent-20 rounded-card text-sm text-accent">
          This program is live. Unpublish to make edits.
        </div>
      )}

      <div className="space-y-4">
        {localDays.map(({ day, content }) => (
          <div key={day} className="bg-surface border border-border rounded-card p-4">
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">{day}</p>
            <textarea
              value={content}
              onChange={e => {
                if (isPublished) return
                const updated = localDays.map(d => d.day === day ? { ...d, content: e.target.value } : d)
                setLocalDays(updated)
              }}
              onBlur={e => { if (!isPublished) saveDayContent(day, e.target.value) }}
              readOnly={isPublished}
              rows={4}
              placeholder={isPublished ? '' : 'Enter workout content…'}
              className="w-full bg-background border border-border rounded-btn px-3 py-2 text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors resize-none read-only:opacity-60 read-only:cursor-default"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(owner)/programs/[id]/page.tsx" "app/(owner)/programs/[id]/loading.tsx" "app/(owner)/programs/[id]/error.tsx"
git commit -m "feat(programs): add program editor page"
```

---

### Task 9: Member This Week — Published Programs Section

**Files:**
- Modify: `app/(member)/this-week/page.tsx`

This is a **server component** — follow its existing pattern of direct Supabase queries, no `fetch()` calls to API routes.

- [ ] **Step 1: Update the import line for types**

Find:
```ts
import type { WorkoutDay } from '@/lib/types'
```

Replace with:
```ts
import type { WorkoutDay, SpecialtyProgram, ProgramDay } from '@/lib/types'
```

- [ ] **Step 2: Add programs to the parallel Supabase fetch**

Find the existing `Promise.all` block:
```ts
const [{ data: weekData }, { data: instancesRaw }, { data: gymRaw }] = await Promise.all([
  supabase.from('workout_weeks').select('workouts')
    .eq('gym_id', userData.gym_id).eq('status', 'published').is('archived_at', null)
    .eq('week_start', weekStart).maybeSingle(),
  supabase.from('class_instances').select('*')
    .eq('gym_id', userData.gym_id)
    .gte('date', weekStart).lte('date', weekEnd.toISOString().split('T')[0])
    .order('date').order('local_time'),
  supabase.from('gyms').select('show_member_names, waitlist_enabled').eq('id', userData.gym_id).single(),
])
```

Replace with:
```ts
const [{ data: weekData }, { data: instancesRaw }, { data: gymRaw }, { data: programsRaw }] = await Promise.all([
  supabase.from('workout_weeks').select('workouts')
    .eq('gym_id', userData.gym_id).eq('status', 'published').is('archived_at', null)
    .eq('week_start', weekStart).maybeSingle(),
  supabase.from('class_instances').select('*')
    .eq('gym_id', userData.gym_id)
    .gte('date', weekStart).lte('date', weekEnd.toISOString().split('T')[0])
    .order('date').order('local_time'),
  supabase.from('gyms').select('show_member_names, waitlist_enabled').eq('id', userData.gym_id).single(),
  supabase.from('specialty_programs').select('*')
    .eq('gym_id', userData.gym_id)
    .eq('week_start', weekStart)
    .eq('status', 'published')
    .order('name', { ascending: true }),
])
```

- [ ] **Step 3: Extract programs data**

After the existing `const waitlistEnabled = ...` line, add:
```ts
const programs = (programsRaw ?? []) as unknown as SpecialtyProgram[]
```

- [ ] **Step 4: Add OtherPrograms and ProgramCard components**

At the bottom of the file, before the final closing line, add these two components:

```tsx
function OtherPrograms({ programs }: { programs: SpecialtyProgram[] }) {
  if (programs.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-foreground mb-4">Other Programs</h2>
      <div className="space-y-4">
        {programs.map(program => (
          <ProgramCard key={program.id} program={program} />
        ))}
      </div>
    </section>
  )
}

function ProgramCard({ program }: { program: SpecialtyProgram }) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const days = DAYS.map(dayName => {
    const existing = program.days.find((d: ProgramDay) => d.day === dayName)
    return existing ?? { day: dayName, content: '' }
  })
  return (
    <div className="bg-surface border border-border rounded-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-foreground text-sm">{program.name}</h3>
      </div>
      <div className="divide-y divide-border">
        {days.map(({ day, content }) => (
          <details key={day} className="group">
            <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer list-none hover:bg-surface-raised transition-colors">
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">{day}</span>
              <svg aria-hidden="true" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                className="text-secondary group-open:rotate-180 transition-transform duration-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 py-3 text-sm text-secondary whitespace-pre-wrap">
              {content.trim() ? content : <span className="italic">Rest</span>}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Render OtherPrograms in the return block**

Find the closing `</div>` of the return block:
```tsx
  return (
    <div>
      <p className="text-secondary text-sm mb-6 font-medium">{weekLabel}</p>
      {workouts.length === 0 && instances.length === 0 ? (
        ...
      ) : (
        <WeekDayView ... />
      )}
    </div>
  )
```

Add `<OtherPrograms programs={programs} />` before the closing `</div>`:
```tsx
  return (
    <div>
      <p className="text-secondary text-sm mb-6 font-medium">{weekLabel}</p>
      {workouts.length === 0 && instances.length === 0 ? (
        ...
      ) : (
        <WeekDayView ... />
      )}
      <OtherPrograms programs={programs} />
    </div>
  )
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Manual verification**

```bash
npm run dev
```

1. Log in as **owner** → go to Programs → click "New Program" → enter name + week → create
2. In the editor, add content to each day → click Publish
3. Log in as **member** → go to "This Week" → scroll to bottom → see "Other Programs" section
4. Click a day row → content expands
5. Days with no content show "Rest" in italic
6. Go back to owner → unpublish → member page no longer shows the section

- [ ] **Step 8: Commit**

```bash
git add "app/(member)/this-week/page.tsx"
git commit -m "feat(programs): show published programs on member This Week page"
```
