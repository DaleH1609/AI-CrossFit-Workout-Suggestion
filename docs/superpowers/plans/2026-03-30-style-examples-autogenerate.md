# Style Examples Auto-Generate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-click "Generate examples for me" button to the style profile page that calls Claude to produce sample workout examples, shown as selectable cards the owner can save to their profile.

**Architecture:** A new POST endpoint `/api/style/generate-samples` reads the gym's `gym_type` from the `gyms` table, calls Claude (`claude-3-5-haiku-20241022`) with a gym-type-specific prompt, splits the response on `\n---\n`, and returns up to 3 sample strings. The style profile page gains a generate button (shown only when < 3 examples exist), a loading state, selectable pending sample cards, and an "Add selected" flow that saves via the existing `POST /api/style` endpoint.

**Tech Stack:** Next.js 14 App Router, TypeScript, `@anthropic-ai/sdk`, Supabase, Tailwind CSS.

---

## File Structure

| File | Change |
|------|--------|
| `app/api/style/generate-samples/route.ts` | Create — POST endpoint, calls Claude, returns samples |
| `app/(owner)/style-profile/page.tsx` | Modify — generate button, pending sample cards, add-selected flow |

No schema changes, no new env vars.

---

### Task 1: Create the `generate-samples` API endpoint

**Files:**
- Create: `app/api/style/generate-samples/route.ts`

**Background:** Follow the pattern in `app/api/workouts/generate/route.ts` and `lib/claude/generate-workouts.ts`. `requireOwnerAuth()` is in `lib/auth-helpers.ts` — it returns `{ supabase, user, userData: { gym_id, role } }`. The `gym_type` field lives on the `gyms` table, not the `users` table, so a second query is needed. Use `@anthropic-ai/sdk` directly (same client pattern as `lib/claude/generate-workouts.ts`). The existing `POST /api/style` expects `{ rawText: string }`.

- [ ] **Step 1: Create the file with the POST handler**

Create `app/api/style/generate-samples/route.ts` with this exact content:

```ts
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { requireOwnerAuth, isNextResponse } from '@/lib/auth-helpers'

const CROSSFIT_PROMPT = `Generate 3 realistic CrossFit gym workout examples. Each should look like a real whiteboard post — include day, parts (strength + conditioning), movements, sets/reps or time domains, and any time caps. Use plain text with line breaks, the way a coach would write it on a whiteboard. Separate each example with exactly "\n---\n". Return only the workout text, no extra commentary.`

const HYROX_PROMPT = `Generate 3 realistic Hyrox training workout examples. Each should look like a real training session post — include day, station-based work, running intervals, and loading. Use plain text with line breaks. Separate each example with exactly "\n---\n". Return only the workout text, no extra commentary.`

export async function POST() {
  const auth = await requireOwnerAuth()
  if (isNextResponse(auth)) return auth

  const { supabase, userData } = auth

  const { data: gymRow } = await supabase
    .from('gyms')
    .select('gym_type')
    .eq('id', userData.gym_id)
    .single()

  const gymType: 'crossfit' | 'hyrox' =
    gymRow?.gym_type === 'hyrox' ? 'hyrox' : 'crossfit'

  const prompt = gymType === 'hyrox' ? HYROX_PROMPT : CROSSFIT_PROMPT

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let text: string
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })
    text = message.content[0].type === 'text' ? message.content[0].text : ''
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const samples = text
    .split('\n---\n')
    .map(s => s.trim())
    .filter(Boolean)

  if (samples.length === 0) {
    return NextResponse.json({ error: 'Failed to generate samples' }, { status: 500 })
  }

  return NextResponse.json({ samples })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/style/generate-samples/route.ts
git commit -m "feat: add generate-samples API endpoint"
```

---

### Task 2: Update the style profile page

**Files:**
- Modify: `app/(owner)/style-profile/page.tsx`

**Background:** The page is already a `'use client'` component with `examples`, `newText`, and `showNewProgramModal` state. The generate button should only appear when `examples.length < 3`. Pending samples are displayed between the textarea card and the existing examples list. Each pending sample is a selectable card (checkbox + pre-formatted text). "Add selected" fires `Promise.all` of `POST /api/style` calls, then calls `loadExamples()` and clears pending state regardless of success or failure. The existing `POST /api/style` body shape is `{ rawText: string }`.

- [ ] **Step 1: Add new state variables**

Find the existing state declarations:
```ts
  const [examples, setExamples] = useState<{ id: string; raw_text: string }[]>([])
  const [newText, setNewText] = useState('')
  const [showNewProgramModal, setShowNewProgramModal] = useState(false)
```

Replace with:
```ts
  const [examples, setExamples] = useState<{ id: string; raw_text: string }[]>([])
  const [newText, setNewText] = useState('')
  const [showNewProgramModal, setShowNewProgramModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [pendingSamples, setPendingSamples] = useState<string[]>([])
  const [selectedSamples, setSelectedSamples] = useState<Set<number>>(new Set())
  const [addingSelected, setAddingSelected] = useState(false)
```

- [ ] **Step 2: Add `handleGenerate` function**

After the existing `handleNewProgram` function, add:

```ts
  async function handleGenerate() {
    setGenerating(true)
    setGenerateError('')
    setPendingSamples([])
    setSelectedSamples(new Set())
    const res = await fetch('/api/style/generate-samples', { method: 'POST' })
    const data = await res.json()
    setGenerating(false)
    if (!res.ok) { setGenerateError(data.error ?? 'Failed to generate examples'); return }
    setPendingSamples(data.samples)
    setSelectedSamples(new Set(data.samples.map((_: string, i: number) => i)))
  }
```

- [ ] **Step 3: Add `handleAddSelected` function**

Immediately after `handleGenerate`, add:

```ts
  async function handleAddSelected() {
    setGenerateError('')
    setAddingSelected(true)
    const toAdd = pendingSamples.filter((_, i) => selectedSamples.has(i))
    try {
      await Promise.all(
        toAdd.map(rawText =>
          fetch('/api/style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawText }),
          })
        )
      )
    } catch {
      setGenerateError('Some examples failed to save')
    }
    setPendingSamples([])
    setSelectedSamples(new Set())
    setAddingSelected(false)
    await loadExamples()
  }
```

- [ ] **Step 4: Add the generate button and pending samples UI to the JSX**

Find the closing `</Card>` tag of the textarea card followed by the `<div className="space-y-3">`:
```tsx
      </Card>

      <div className="space-y-3">
```

Replace with:
```tsx
      </Card>

      {examples.length < 3 && (
        <div className="mb-6">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 text-sm text-accent border border-accent-border rounded-btn px-4 py-2 hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating && (
              <svg className="animate-spin h-4 w-4 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {generating ? 'Generating...' : 'Generate examples for me'}
          </button>
          {generateError && <p className="text-danger text-xs mt-2">{generateError}</p>}
          {pendingSamples.length > 0 && (
            <div className="mt-4 space-y-3">
              {pendingSamples.map((sample, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSamples.has(i)}
                    onChange={() => {
                      const next = new Set(selectedSamples)
                      next.has(i) ? next.delete(i) : next.add(i)
                      setSelectedSamples(next)
                    }}
                    className="mt-1 accent-accent"
                  />
                  <Card className="flex-1">
                    <pre className="text-white/80 text-sm whitespace-pre-wrap font-mono">{sample}</pre>
                  </Card>
                </label>
              ))}
              <div className="flex justify-end">
                <Button
                  onClick={handleAddSelected}
                  disabled={selectedSamples.size === 0 || addingSelected}
                >
                  {addingSelected ? 'Adding...' : 'Add selected'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/dalehealyegan/Desktop/CrossFit/crossfit-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual smoke test**

Run `npm run dev` and open `/style-profile` as an owner with fewer than 3 examples.

Checklist:
- [ ] "Generate examples for me" button appears when < 3 examples
- [ ] Button shows "Generating..." while loading, disabled during load
- [ ] After generation: 2–3 sample cards appear, all pre-checked
- [ ] Unchecking a card removes it from selection; "Add selected" disables when none checked
- [ ] "Add selected" saves chosen samples, clears pending cards, reloads list
- [ ] Once ≥ 3 examples exist, button is hidden
- [ ] If API errors, inline error message appears below button

- [ ] **Step 7: Commit**

```bash
git add app/(owner)/style-profile/page.tsx
git commit -m "feat: add generate examples button to style profile"
```

---

### Task 3: Deploy to production

- [ ] **Step 1: Deploy**

```bash
vercel --prod
```

Expected: build succeeds, deployment URL printed.

- [ ] **Step 2: Smoke test on production**

Visit `/style-profile` on the production URL. Run the smoke test checklist from Task 2 Step 6.

- [ ] **Step 3: If deploy fails**

```bash
vercel logs <deployment-url>
```

Check for build errors. Common fixes: missing env var (`ANTHROPIC_API_KEY` must be set in Vercel production environment), TypeScript errors caught at build time.
