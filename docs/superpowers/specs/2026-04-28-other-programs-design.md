# Other Programs — Implementation Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give gym owners a simple way to create and publish specialty programs (Running, Hyrox, Weightlifting, or anything custom) alongside the main WOD, visible to members on the "This Week" page.

**Architecture:** New `specialty_programs` Supabase table. Owner CRUD via new `/programs` page in the owner section. Members see published programs for the current week appended to the existing "This Week" page. No AI — all content is written manually by the owner.

**Tech Stack:** Next.js App Router, Supabase, Tailwind CSS, existing auth helpers and API response utilities.

---

## Data Model

### New table: `specialty_programs`

```sql
create table specialty_programs (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references gyms(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  week_start  date not null,
  days        jsonb not null default '[]',
  -- days shape: [{ day: 'Monday', content: 'text' }, ...]
  status      text not null default 'draft' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(gym_id, name, week_start)
);

-- Auto-update updated_at on every row change
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

### Migration file
`supabase/migrations/018_specialty_programs.sql`

---

## File Structure

### New files
- `supabase/migrations/018_specialty_programs.sql` — table + RLS
- `app/(owner)/programs/page.tsx` — programs list + create
- `app/(owner)/programs/loading.tsx` — skeleton for list page
- `app/(owner)/programs/error.tsx` — error boundary for list page
- `app/(owner)/programs/[id]/page.tsx` — program editor (day-by-day content)
- `app/(owner)/programs/[id]/loading.tsx` — skeleton for editor page
- `app/(owner)/programs/[id]/error.tsx` — error boundary for editor page
- `app/api/programs/route.ts` — GET (list), POST (create)
- `app/api/programs/[id]/route.ts` — GET (single), PATCH (update), DELETE
- `app/api/programs/[id]/publish/route.ts` — POST (publish), DELETE (unpublish)
- `app/api/programs/published/route.ts` — GET published programs for current week (member)

### Modified files
- `components/layout/owner-sidebar.tsx` — add "Programs" nav item
- `app/(member)/this-week/page.tsx` — fetch + render published programs section
- `lib/types.ts` — add `ProgramDay`, `SpecialtyProgram` types

---

## Types (`lib/types.ts`)

```ts
export interface ProgramDay {
  day: string      // 'Monday' | 'Tuesday' | etc.
  content: string  // free text
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

---

## API Routes

### `GET /api/programs`
Owner auth. Returns all programs for the gym ordered by `week_start desc, created_at desc`.

### `POST /api/programs`
Owner auth. Body: `{ name: string, weekStart: string }`. Creates a draft program with an empty days array (7 days pre-populated with empty content). Returns new program.

Schema validation:
- `name`: string, 1–80 chars, trimmed
- `weekStart`: string matching `YYYY-MM-DD`

Returns 409 if a program with the same `name` and `week_start` already exists for the gym (unique constraint violation).

### `GET /api/programs/[id]`
Owner auth. Returns single program (must belong to gym). UUID validation on `id`.

### `PATCH /api/programs/[id]`
Owner auth. UUID validation on `id`. Body: `{ name?: string, days?: ProgramDay[] }`.

Behaviour:
- **`name`**: can be updated regardless of status (draft or published).
- **`days`**: can only be updated when status is `'draft'`. If status is `'published'`, return 409 with message `"Published programs cannot be edited. Unpublish first."`.

Returns updated program.

### `DELETE /api/programs/[id]`
Owner auth. UUID validation on `id`. Hard deletes the row (no bookings or other records reference programs). Returns `{ success: true }`.

### `POST /api/programs/[id]/publish`
Owner auth. UUID validation on `id`. Sets `status = 'published'`. Returns updated program.

### `DELETE /api/programs/[id]/publish`
Owner auth. UUID validation on `id`. Sets `status = 'draft'` (unpublish). Returns updated program.

### `GET /api/programs/published`
Member auth. Query param: `weekStart` (required, must match `YYYY-MM-DD`).

Validation:
- If `weekStart` is missing or does not match `YYYY-MM-DD`, return 400 with a descriptive error.

Returns all published programs for the gym for that week, ordered by `name asc`. If none, returns `{ programs: [] }`.

---

## Owner UI

### Programs list page (`/programs`)

- Page heading: "Programs" with subtext "Specialty programs published to your members."
- "New Program" button — opens an inline form (name input + week date picker). On submit, calls `POST /api/programs` and redirects to the new program's editor page.
- List of programs as cards: name, week label, status badge (Draft / Published), "Edit" link, publish/unpublish toggle button, delete button with confirmation.
- Empty state: "No programs yet. Create your first one."
- Programs sorted by `week_start desc, name asc` (matches API order).
- `loading.tsx`: pulse skeleton cards (3 placeholder rows).
- `error.tsx`: uses existing `RouteError` component.

### Program editor page (`/programs/[id]`)

- Heading: program name — editable inline (click to edit, blur triggers PATCH to `name`).
- Week display: "Week of {week_start}" — read-only.
- Status badge + Publish / Unpublish button in the header row.
- Day-by-day content editor: 7 sections (Monday → Sunday). Each section has a day label and a `<textarea>` for free text. Auto-saves on blur via PATCH to `days`. Placeholder: "Rest day / Enter workout content…"
- When status is `'published'`: all textareas are `readOnly` with a banner: "This program is live. Unpublish to make edits."
- Back link to `/programs`.
- `loading.tsx`: pulse skeleton for header + 7 day sections.
- `error.tsx`: uses existing `RouteError` component.

---

## Member UI

### "This Week" page additions

Below the existing class booking grid, conditionally render an "Other Programs" section.

**Data fetching:** On page load, call `GET /api/programs/published?weekStart={currentWeekStart}` in parallel with the existing schedule fetch.

**Loading state:** While fetching, show 2 skeleton cards (pulse animation) inside the "Other Programs" section heading.

**Error state:** If the fetch fails, silently suppress — do not show an error banner. Members should not see a broken section for what is supplementary content.

**Empty state:** If `programs` is an empty array, render nothing (no section heading, no empty message).

**Rendered state:** Show section heading "Other Programs" followed by one card per program:
- Program name as card heading
- Each day rendered as a collapsible row: day label + content (click to expand)
- Days with empty content are rendered as "Rest" in muted text

---

## Owner Sidebar

Add nav item between "Class Schedule" and "Members":

```ts
{ href: '/programs', label: 'Programs', Icon: IconGrid }
```

Add a new `IconGrid` SVG inline in `owner-sidebar.tsx` following the existing icon pattern (18×18, `fill="none"`, `strokeWidth="1.8"`).

---

## Error Handling

- All API routes use existing `jsonOk` / `jsonError` / `jsonServerError` helpers.
- UUID validation on all `[id]` params using existing `UUID_RE` pattern.
- 400 for invalid/missing `weekStart` on the published route.
- 404 if program not found or belongs to different gym.
- 409 if trying to edit `days` on a published program.
- 409 on duplicate `(gym_id, name, week_start)` at creation.

---

## Out of Scope

- AI generation of program content
- Member-specific program assignment (all published programs visible to all members)
- Program templates or reuse across weeks
- Score logging against programs (separate feature)
