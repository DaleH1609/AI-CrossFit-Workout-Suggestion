# Smarter AI Programming — Design Spec

## Goal

Make workout generation aware of the last 4 weeks of programming so it naturally avoids repetition, fills movement gaps, and balances intensity — with a panel on the dashboard showing the owner what the AI sees before they generate.

---

## Background

The existing generate endpoint (`POST /api/workouts/generate`) calls Claude to produce a 5-day workout program. It currently receives gym type, coaching style examples, and a basic recent history, but has no structured awareness of movement patterns across the last several weeks. This means the AI may inadvertently repeat movements, neglect others, or create imbalanced intensity distribution across a mesocycle.

---

## Feature Overview

### 1. Movement Analysis Endpoint

**`GET /api/workouts/movement-analysis`**

- Auth: owner-only via `requireOwnerAuth()`
- Fetches the last 4 published `workout_weeks` for the gym (ordered by `week_start DESC`, limit 4)
- If fewer than 2 published weeks exist, returns `{ insufficient_data: true }` — not enough history to analyse
- Sends the workout content to Claude with a focused analysis prompt
- Returns structured JSON:

```ts
{
  gaps: Array<{ movement: string; daysSince: number }>,      // not seen in 10+ days
  overused: Array<{ movement: string; count: number }>,      // 3+ times in last 2 weeks
  balance: { push: number; pull: number; squat: number; hinge: number; carry: number },
  intensityDistribution: { heavy_strength: number; conditioning: number; skill: number },
  weeksAnalysed: number
}
```

- Claude performs the analysis entirely in natural language — no regex or keyword parsing
- Response is not cached; fetched fresh each time the dashboard loads

---

### 2. Enhanced Generation Prompt

**`POST /api/workouts/generate`** — modified

In addition to existing context (gym type, style examples), the generate endpoint now:

1. Fetches the last 4 published workout weeks (same query as the analysis endpoint — extracted to a shared helper `lib/workouts/get-recent-weeks.ts`)
2. Appends the workout history to the Claude prompt as context
3. Adds explicit periodization instructions to the system prompt:
   - Balance push / pull / squat / hinge / carry movements across the week
   - Avoid movements that appeared 3+ times in the last 2 weeks
   - Prioritise movements not seen in 10+ days
   - Vary intensity: not every day should be heavy strength or every day conditioning

The history is passed as formatted text (not the raw JSONB) so Claude can reason about it naturally. If fewer than 2 published weeks exist, the history section is omitted from the prompt and generation proceeds as before.

---

### 3. Dashboard Panel — Movement Intelligence

**`app/(owner)/dashboard/page.tsx`** — modified
**`components/workout/MovementIntelligencePanel.tsx`** — new client component

A card displayed above the Generate button on the dashboard. It:

- Fetches from `GET /api/workouts/movement-analysis` on mount
- Shows a loading skeleton while fetching
- Is hidden entirely if `insufficient_data: true` (fewer than 2 published weeks)
- Displays:
  - **Gaps** — movements not programmed in 10+ days, shown as warning tags
  - **Overused** — movements appearing 3+ times in the last 2 weeks, shown as caution tags
  - **Balance row** — push / pull / squat / hinge counts for the last 4 weeks
- Does not block generation — it is purely informational

---

## File Structure

| File | Change |
|------|--------|
| `lib/workouts/get-recent-weeks.ts` | Create — shared helper: fetch last N published weeks for a gym |
| `lib/claude/prompts.ts` | Modify — format history as readable text (not raw JSONB); add periodization instructions to generate prompt |
| `app/api/workouts/movement-analysis/route.ts` | Create — GET endpoint returning structured movement analysis; use `max_tokens: 4096`; return `{ error: true }` on Claude parse failure |
| `app/api/workouts/generate/route.ts` | Modify — use shared `get-recent-weeks` helper; pass formatted history to updated prompt builder |
| `components/workout/MovementIntelligencePanel.tsx` | Create — dashboard panel component; handles three states: loading, `insufficient_data`, `error`, and success |
| `app/(owner)/dashboard/page.tsx` | Modify — render MovementIntelligencePanel above Generate button (page is already `'use client'`) |

---

## Out of Scope

- Storing structured movement tags in the database (analysis is always computed on-demand)
- Owner-configurable periodization rules
- Per-member movement tracking
- Movement analysis for Hyrox gyms (same logic applies — Claude handles the difference)
- Caching the analysis response
