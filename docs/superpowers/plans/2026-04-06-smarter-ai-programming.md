# Smarter AI Programming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make workout generation aware of the last 4 weeks of programming history and add a dashboard panel showing the owner what the AI sees before generating.

**Architecture:** A shared `getRecentWeeks` helper fetches the last 4 published weeks from Supabase and is used by both the enhanced generate route and a new movement-analysis endpoint. The analysis endpoint calls Claude with a focused prompt and returns structured gap/overuse/balance data. The dashboard renders a `MovementIntelligencePanel` that fetches this data on mount.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (anon key + RLS), Anthropic Claude SDK (already installed), Vitest

---

## File Map

| File | Action |
|------|--------|
| `lib/workouts/get-recent-weeks.ts` | Create — shared helper to fetch last N published weeks |
| `lib/types.ts` | Modify — add `RecentWeek` and `MovementAnalysis` types |
| `lib/claude/prompts.ts` | Modify — readable history format, periodization rules, analysis prompt |
| `lib/claude/generate-workouts.ts` | Modify — add `analyseMovementHistory` function |
| `app/api/workouts/generate/route.ts` | Modify — use `getRecentWeeks` helper |
| `app/api/workouts/movement-analysis/route.ts` | Create — GET endpoint |
| `components/workout/MovementIntelligencePanel.tsx` | Create — dashboard panel |
| `app/(owner)/dashboard/page.tsx` | Modify — render panel above Generate button |
| `tests/lib/workouts/get-recent-weeks.test.ts` | Create |
| `tests/lib/claude/prompts.test.ts` | Create |

---

## Task 1: Shared helper and types

**Files:**
- Create: `lib/workouts/get-recent-weeks.ts`
- Modify: `lib/types.ts`
- Create: `tests/lib/workouts/get-recent-weeks.test.ts`

- [ ] **Step 1: Add types to `lib/types.ts`**

Open `lib/types.ts` and append at the bottom:

```typescript
export interface RecentWeek {
  week_start: string
  workouts: WorkoutWeek
}

export interface MovementAnalysis {
  gaps: Array<{ movement: string; daysSince: number }>
  overused: Array<{ movement: string; count: number }>
  balance: { push: number; pull: number; squat: number; hinge: number; carry: number }
  intensityDistribution: { heavy_strength: number; conditioning: number; skill: number }
  weeksAnalysed: number
}
```

- [ ] **Step 2: Create `lib/workouts/get-recent-weeks.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RecentWeek } from '@/lib/types'

export async function getRecentWeeks(
  supabase: SupabaseClient,
  gymId: string,
  limit = 4
): Promise<RecentWeek[]> {
  const { data } = await supabase
    .from('workout_weeks')
    .select('week_start, workouts')
    .eq('gym_id', gymId)
    .eq('status', 'published')
    .is('archived_at', null)
    .order('week_start', { ascending: false })
    .limit(limit)
  return ((data || []) as RecentWeek[]).reverse() // oldest first
}
```

- [ ] **Step 3: Write the test**

Create `tests/lib/workouts/get-recent-weeks.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getRecentWeeks } from '@/lib/workouts/get-recent-weeks'

function makeSupabase(rows: unknown[] | null) {
  const chain: Record<string, unknown> = {}
  const terminal = { limit: () => Promise.resolve({ data: rows }) }
  const order = { order: () => terminal }
  const is = { is: () => order }
  const eq2 = { eq: () => is, is: () => order }
  const eq1 = { eq: () => eq2 }
  const select = { select: () => eq1 }
  chain.from = () => select
  return chain as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>
}

describe('getRecentWeeks', () => {
  it('returns rows reversed (oldest first)', async () => {
    const rows = [
      { week_start: '2026-03-30', workouts: [] },
      { week_start: '2026-03-23', workouts: [] },
    ]
    const result = await getRecentWeeks(makeSupabase(rows), 'gym-1')
    expect(result[0].week_start).toBe('2026-03-23')
    expect(result[1].week_start).toBe('2026-03-30')
  })

  it('returns empty array when data is null', async () => {
    const result = await getRecentWeeks(makeSupabase(null), 'gym-1')
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 4: Run test — expect FAIL (module not found is fine, type errors are fine)**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx vitest run tests/lib/workouts/get-recent-weeks.test.ts
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npx vitest run tests/lib/workouts/get-recent-weeks.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/workouts/get-recent-weeks.ts lib/types.ts tests/lib/workouts/get-recent-weeks.test.ts
git commit -m "feat: add getRecentWeeks helper and MovementAnalysis types"
```

---

## Task 2: Update prompts — readable history format, periodization rules, analysis prompt

**Files:**
- Modify: `lib/claude/prompts.ts`
- Create: `tests/lib/claude/prompts.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `tests/lib/claude/prompts.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildGenerationPrompt, buildMovementAnalysisPrompt } from '@/lib/claude/prompts'
import type { WorkoutWeek, RecentWeek } from '@/lib/types'

const sampleWeek: WorkoutWeek = [
  { day: 'Monday', parts: [{ label: null, type: 'strength', content: 'Back Squat 5×5\nRest 2 min' }] },
  { day: 'Tuesday', parts: [{ label: null, type: 'fortime', content: '21-15-9 Thrusters, Pull-ups' }] },
  { day: 'Wednesday', parts: [{ label: null, type: 'strength', content: 'Deadlift 4×4' }] },
  { day: 'Thursday', parts: [{ label: null, type: 'partner', content: '30 min AMRAP' }] },
  { day: 'Friday', parts: [{ label: null, type: 'amrap', content: '20 min AMRAP: 5 pull-ups' }] },
]

describe('buildGenerationPrompt', () => {
  it('does not include JSON.stringify output in history section', () => {
    const prompt = buildGenerationPrompt([], [sampleWeek], 'crossfit')
    // Only check the history section — the output schema block contains "parts" and "label" legitimately
    const historySection = prompt.split('## Previous Weeks')[1].split('##')[0]
    expect(historySection).not.toContain('"parts"')
    expect(historySection).not.toContain('"label"')
  })

  it('includes periodization instructions', () => {
    const prompt = buildGenerationPrompt([], [sampleWeek], 'crossfit')
    expect(prompt.toLowerCase()).toContain('periodization')
  })

  it('includes movement content in readable form', () => {
    const prompt = buildGenerationPrompt([], [sampleWeek], 'crossfit')
    expect(prompt).toContain('Back Squat')
  })
})

describe('buildMovementAnalysisPrompt', () => {
  it('includes today date and week_start dates', () => {
    const history: RecentWeek[] = [
      { week_start: '2026-03-23', workouts: sampleWeek },
    ]
    const prompt = buildMovementAnalysisPrompt(history)
    expect(prompt).toContain('2026-03-23')
    expect(prompt).toContain(new Date().toISOString().split('T')[0])
  })

  it('includes movement content', () => {
    const history: RecentWeek[] = [
      { week_start: '2026-03-23', workouts: sampleWeek },
    ]
    const prompt = buildMovementAnalysisPrompt(history)
    expect(prompt).toContain('Back Squat')
  })

  it('includes weeksAnalysed count in schema comment', () => {
    const history: RecentWeek[] = [
      { week_start: '2026-03-23', workouts: sampleWeek },
      { week_start: '2026-03-30', workouts: sampleWeek },
    ]
    const prompt = buildMovementAnalysisPrompt(history)
    expect(prompt).toContain('2')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run tests/lib/claude/prompts.test.ts
```

Expected: fails (buildMovementAnalysisPrompt not exported yet, JSON.stringify still present).

- [ ] **Step 3: Rewrite `lib/claude/prompts.ts`**

Replace the entire file with:

```typescript
// lib/claude/prompts.ts
import type { WorkoutWeek, RecentWeek } from '@/lib/types'

const CROSSFIT_BUILTIN = `You are an expert CrossFit programmer. Generate a Mon–Fri week with:
- Monday: Strength (squat/hinge) + interval conditioning
- Tuesday: For-time or AMRAP with gymnastics and cardio
- Wednesday: Pure strength (push/pull focus)
- Thursday: Partner or team workout
- Friday: Open-style benchmark or chipper
Use classic CrossFit movements: barbell cycling, gymnastics (pull-ups, HSPU, T2B),
monostructural cardio (row, bike, run), and kettlebell work.
Vary loading and time domains across the week.`

const HYROX_BUILTIN = `You are an expert Hyrox programmer. Generate a Mon–Fri training week with:
- Monday: Ski erg intervals + strength (deadlift or squat)
- Tuesday: Sled push/pull work + accessory lifting
- Wednesday: Running + wall balls + sandbag lunges (race simulation)
- Thursday: Farmers carry + burpee broad jumps + rowing
- Friday: Full Hyrox race simulation (all 8 stations in sequence)
Hyrox stations: 1km run (between each), ski erg 1000m, sled push 50m,
sled pull 50m, burpee broad jumps 80m, rowing 1000m, farmers carry 200m,
sandbag lunges 100m, wall balls 100 reps.
Keep weights competition-standard (men/women Rx). Include scaling options.`

const PERIODIZATION_RULES = `## Periodization Requirements
- Prioritise movements that have NOT appeared in the last 2 weeks
- Do not repeat the same primary barbell movement on consecutive days
- Ensure the week contains at least one lower-body push (squat), one lower-body pull (hinge/deadlift), one upper-body push, and one upper-body pull
- Vary intensity: avoid programming heavy strength as the primary focus on 3+ consecutive days`

const OUTPUT_REQUIREMENTS = `## Output Requirements
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
}`

function formatWeekAsText(week: WorkoutWeek, label: string): string {
  const dayLines = week.map(day => {
    const content = day.parts.map(p => p.content.split('\n')[0]).join(' | ')
    return `  ${day.day}${day.descriptor ? ` (${day.descriptor})` : ''}: ${content}`
  }).join('\n')
  return `${label}:\n${dayLines}`
}

export function buildGenerationPrompt(
  styleExamples: string[],
  history: WorkoutWeek[],
  gymType: 'crossfit' | 'hyrox' = 'crossfit'
): string {
  const historyText = history.length === 0
    ? 'No previous weeks — this is the first week.'
    : history.map((week, i) => formatWeekAsText(week, `Week ${i + 1}`)).join('\n\n')

  if (styleExamples.length >= 3) {
    const examplesText = styleExamples.join('\n\n---\n\n')
    return `You are a CrossFit programming coach. Generate a new Mon–Fri workout week that matches the style of the examples below.

## Style Examples (match this format exactly)
${examplesText}

## Previous Weeks (most recent last)
${historyText}

${PERIODIZATION_RULES}

${OUTPUT_REQUIREMENTS}

Rules:
- Follow the exact same formatting conventions as the examples (minute markers, time caps, sets x reps notation)
- Keep the same day types as the examples (Mon/Fri = interval, Wed = strength, Thu = partner, Tue = for time)`
  }

  const builtinPrompt = gymType === 'hyrox' ? HYROX_BUILTIN : CROSSFIT_BUILTIN

  return `${builtinPrompt}

## Previous Weeks (most recent last)
${historyText}

${PERIODIZATION_RULES}

${OUTPUT_REQUIREMENTS}

Rules:
- Vary movement patterns across the week
- Keep appropriate time domains and loading for the gym type`
}

export function buildMovementAnalysisPrompt(history: RecentWeek[]): string {
  const today = new Date().toISOString().split('T')[0]
  const weeksText = history
    .map(({ week_start, workouts }) => formatWeekAsText(workouts, `Week of ${week_start}`))
    .join('\n\n')

  return `You are analysing a CrossFit gym's recent programming to identify movement patterns, gaps, and imbalances. Today's date is ${today}.

## Workout History (oldest first)
${weeksText}

Return ONLY valid JSON — no markdown, no explanation:
{
  "gaps": [{ "movement": string, "daysSince": number }],
  "overused": [{ "movement": string, "count": number }],
  "balance": { "push": number, "pull": number, "squat": number, "hinge": number, "carry": number },
  "intensityDistribution": { "heavy_strength": number, "conditioning": number, "skill": number },
  "weeksAnalysed": ${history.length}
}

Rules:
- gaps: named primary movements (e.g. "Deadlift", "Overhead Press") last seen 10+ days ago — max 5 items, most overdue first
- overused: movements appearing 3+ times in the last 14 days — max 5 items
- balance: total count of training days each movement CATEGORY appeared across all ${history.length} weeks
- intensityDistribution: total count of training days by primary focus across all ${history.length} weeks
- Estimate daysSince from today vs the week_start of the week the movement last appeared`
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/lib/claude/prompts.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/claude/prompts.ts tests/lib/claude/prompts.test.ts
git commit -m "feat: readable history format, periodization rules, movement analysis prompt"
```

---

## Task 3: Add `analyseMovementHistory` to generate-workouts and update generate route

**Files:**
- Modify: `lib/claude/generate-workouts.ts`
- Modify: `app/api/workouts/generate/route.ts`

- [ ] **Step 1: Add `analyseMovementHistory` to `lib/claude/generate-workouts.ts`**

Add a new import at the top of the existing imports:

```typescript
import { buildGenerationPrompt, buildMovementAnalysisPrompt } from './prompts'
import type { WorkoutWeek, MovementAnalysis, RecentWeek } from '@/lib/types'
```

Then add `validateMovementAnalysis` and `analyseMovementHistory` after the existing `generateWorkouts` function:

```typescript
function validateMovementAnalysis(data: unknown): data is MovementAnalysis {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    Array.isArray(d.gaps) &&
    Array.isArray(d.overused) &&
    typeof d.balance === 'object' && d.balance !== null &&
    typeof d.intensityDistribution === 'object' && d.intensityDistribution !== null &&
    typeof d.weeksAnalysed === 'number'
  )
}

export async function analyseMovementHistory(
  history: RecentWeek[]
): Promise<MovementAnalysis | null> {
  const client = getClient()
  const prompt = buildMovementAnalysisPrompt(history)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const parsed = JSON.parse(text)
    return validateMovementAnalysis(parsed) ? parsed : null
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Update `app/api/workouts/generate/route.ts`** — replace the history query with the shared helper

Change the imports at the top to add:

```typescript
import { getRecentWeeks } from '@/lib/workouts/get-recent-weeks'
```

Replace lines 50-56 (the inline history query):

```typescript
  // Get last 4 published weeks (not archived)
  const { data: history } = await supabase
    .from('workout_weeks').select('workouts')
    .eq('gym_id', gymId).eq('status', 'published').is('archived_at', null)
    .order('week_start', { ascending: false }).limit(4)

  const historyWeeks = (history || []).map(h => h.workouts).reverse()
```

With:

```typescript
  const recentWeeks = await getRecentWeeks(supabase, gymId)
  const historyWeeks = recentWeeks.map(w => w.workouts)
```

- [ ] **Step 3: Run existing tests to confirm nothing broke**

```bash
npx vitest run tests/lib/claude/generate-workouts.test.ts
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/claude/generate-workouts.ts app/api/workouts/generate/route.ts
git commit -m "feat: add analyseMovementHistory, use getRecentWeeks in generate route"
```

---

## Task 4: Movement analysis API endpoint

**Files:**
- Create: `app/api/workouts/movement-analysis/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/workouts/movement-analysis/route.ts
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'
import { getRecentWeeks } from '@/lib/workouts/get-recent-weeks'
import { analyseMovementHistory } from '@/lib/claude/generate-workouts'

export async function GET() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth
  const { supabase, userData } = auth

  const recentWeeks = await getRecentWeeks(supabase, userData.gym_id)

  if (recentWeeks.length < 2) {
    return NextResponse.json({ insufficient_data: true })
  }

  const analysis = await analyseMovementHistory(recentWeeks)
  if (!analysis) {
    return NextResponse.json({ error: true })
  }

  return NextResponse.json(analysis)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add app/api/workouts/movement-analysis/route.ts
git commit -m "feat: add GET /api/workouts/movement-analysis endpoint"
```

---

## Task 5: MovementIntelligencePanel component

**Files:**
- Create: `components/workout/MovementIntelligencePanel.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/workout/MovementIntelligencePanel.tsx
'use client'
import { useEffect, useState } from 'react'
import type { MovementAnalysis } from '@/lib/types'

type PanelState =
  | { status: 'loading' }
  | { status: 'hidden' }   // insufficient_data or error
  | { status: 'ready'; data: MovementAnalysis }

export function MovementIntelligencePanel() {
  const [state, setState] = useState<PanelState>({ status: 'loading' })

  useEffect(() => {
    fetch('/api/workouts/movement-analysis')
      .then(r => r.json())
      .then((data: MovementAnalysis & { insufficient_data?: boolean; error?: boolean }) => {
        if (data.insufficient_data || data.error) {
          setState({ status: 'hidden' })
        } else {
          setState({ status: 'ready', data })
        }
      })
      .catch(() => setState({ status: 'hidden' }))
  }, [])

  if (state.status === 'hidden') return null

  if (state.status === 'loading') {
    return (
      <div className="mb-4 p-4 bg-surface rounded-card border border-accent-border animate-pulse">
        <div className="h-3 w-40 bg-accent-border rounded mb-3" />
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-accent-border rounded" />
          <div className="h-6 w-32 bg-accent-border rounded" />
        </div>
      </div>
    )
  }

  const { data } = state

  return (
    <div className="mb-4 p-4 bg-surface rounded-card border border-accent-border">
      <p className="text-secondary text-xs font-medium uppercase tracking-wide mb-3">
        Programming Intelligence — Last {data.weeksAnalysed} weeks
      </p>

      {data.gaps.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {data.gaps.map(g => (
            <span
              key={g.movement}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-xs"
            >
              ⚠ {g.movement} · {g.daysSince}d ago
            </span>
          ))}
        </div>
      )}

      {data.overused.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {data.overused.map(o => (
            <span
              key={o.movement}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 border border-orange-500/30 rounded text-orange-400 text-xs"
            >
              ↑ {o.movement} × {o.count}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-4 mt-2">
        {Object.entries(data.balance).map(([key, count]) => (
          <span key={key} className="text-secondary text-xs capitalize">
            {key} <span className="text-white font-medium">{count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/workout/MovementIntelligencePanel.tsx
git commit -m "feat: add MovementIntelligencePanel component"
```

---

## Task 6: Wire panel into dashboard

**Files:**
- Modify: `app/(owner)/dashboard/page.tsx`

- [ ] **Step 1: Add the import**

At the top of `app/(owner)/dashboard/page.tsx`, add to the existing imports:

```typescript
import { MovementIntelligencePanel } from '@/components/workout/MovementIntelligencePanel'
```

- [ ] **Step 2: Render panel above the workout grid**

In the JSX, find the line:

```typescript
      {error && <p className="text-red-400 mb-4">{error}</p>}
      <WorkoutWeekGrid
```

And insert the panel just before the error line:

```typescript
      <MovementIntelligencePanel />
      {error && <p className="text-red-400 mb-4">{error}</p>}
      <WorkoutWeekGrid
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/(owner)/dashboard/page.tsx
git commit -m "feat: render MovementIntelligencePanel on dashboard"
```

---

## Task 7: Deploy to production

- [ ] **Step 1: Deploy**

```bash
vercel --prod
```

Expected: deployment completes with status READY.

- [ ] **Step 2: Verify manually**

1. Log in as an owner at `https://crossfit-app-six.vercel.app`
2. Navigate to the dashboard
3. If the gym has 2+ published weeks: the panel loads and shows gaps/overuse tags
4. If the gym has fewer than 2 published weeks: no panel visible (hidden state)
5. Click Generate — verify generation completes and the prompt now uses readable history (check Vercel function logs if needed)
