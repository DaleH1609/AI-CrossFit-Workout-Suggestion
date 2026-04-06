# Style Examples Auto-Generate — Design Spec

## Goal

Lower the barrier to unlocking workout generation by adding a one-click "Generate examples for me" button to the style profile page. Owners who are too busy to write 3 manual examples can generate them instantly with Claude.

## Context

The style profile page (`app/(owner)/style-profile/page.tsx`) requires at least 3 style examples before workout generation is enabled. Examples are stored in `style_examples` (gym-scoped, soft-archivable). The gym's `gym_type` (`crossfit` | `hyrox`) is stored in the `gyms` table and already used by the workout generator to pick the correct built-in prompt. The existing `POST /api/style` endpoint saves individual examples.

---

## Feature Design

### When it appears

The "Generate examples for me" button is shown only when the owner has fewer than 3 active examples. Once they have 3 or more the button is hidden — it is only needed to get past the initial barrier.

### UX flow

1. Owner sees the button below the textarea when they have < 3 examples.
2. They click it. The button becomes a loading spinner.
3. Claude generates 3 sample workouts appropriate for their gym type.
4. Three selectable cards appear below the button — all pre-checked by default.
5. Owner unchecks any they don't want, then clicks "Add selected".
6. Each selected sample is saved via `POST /api/style`. The pending cards clear.
7. The example list updates and the button hides once ≥ 3 examples exist.

If the owner already has 1 or 2 examples, the flow works identically — they just pick however many they need to reach 3.

### Error handling

- If generation fails, show an inline error message below the button. The loading state clears.
- "Add selected" is disabled while any save is in flight.

---

## Architecture

### New file: `app/api/style/generate-samples/route.ts`

**Method:** POST (no body required)

**Auth:** `requireOwnerAuth`

**Logic:**
1. Look up the gym's `gym_type` from the `gyms` table.
2. Call Claude (`claude-3-5-haiku-20241022` — cheap, fast, sufficient) with `max_tokens: 2048` and a prompt asking for 3 realistic workout examples in the gym's style.
3. Parse the response into an array of raw text strings (1–3 items).
4. Return `{ samples: string[] }`.

**Does not write to the DB** — samples are returned to the client for the owner to review and selectively save.

**`gym_type` lookup:** `requireOwnerAuth` returns `userData` from the `users` table which does not include `gym_type`. A second query is required: `supabase.from('gyms').select('gym_type').eq('id', userData.gym_id).single()`. This matches the pattern in `app/api/workouts/generate/route.ts`.

**Prompt design:**

For CrossFit:
```
Generate 3 realistic CrossFit gym workout examples. Each should look like a real whiteboard post — include day, parts (strength + conditioning), movements, sets/reps or time domains, and any time caps. Use plain text with line breaks, the way a coach would write it on a whiteboard. Separate each example with exactly "\n---\n"
```

For Hyrox:
```
Generate 3 realistic Hyrox training workout examples. Each should look like a real training session post — include day, station-based work, running intervals, and loading. Use plain text with line breaks. Separate each example with exactly "\n---\n"
```

**Response parsing:** Split on `\n---\n`, trim each part, filter empty strings. Accept 1–3 non-empty strings (Claude may occasionally produce fewer due to formatting). If the result is empty, return a 500 with a plain error message. Do not require exactly 3.

### Modified file: `app/(owner)/style-profile/page.tsx`

**New state:**
```ts
const [generating, setGenerating] = useState(false)
const [generateError, setGenerateError] = useState('')
const [pendingSamples, setPendingSamples] = useState<string[]>([])
const [selectedSamples, setSelectedSamples] = useState<Set<number>>(new Set())
const [addingSelected, setAddingSelected] = useState(false)
```

**New function `handleGenerate`:**
- Sets `generating = true`, clears `generateError` and any existing `pendingSamples`
- POSTs to `/api/style/generate-samples`
- On success: sets `pendingSamples` to the returned strings, pre-selects all of them (`selectedSamples = new Set(samples.map((_, i) => i))`)
- On failure: sets `generateError`
- Always: sets `generating = false`

**New function `handleAddSelected`:**
- Sets `addingSelected = true`
- Fires all selected saves in parallel via `Promise.all` — each POSTs to `POST /api/style` with the sample text
- On any rejection: sets `generateError` with a save failure message
- Always (success or partial failure): calls `loadExamples()` to reflect whatever was saved, clears `pendingSamples` and `selectedSamples`, sets `addingSelected = false`

**Button placement:** Below the existing textarea card, above the examples list. Only rendered when `examples.length < 3`.

**Clicking "Generate examples for me" again** while `pendingSamples` is already populated replaces the previous pending samples (the existing clear-then-fetch behaviour in `handleGenerate` already achieves this).

**Pending samples UI:** Rendered between the generate button and the examples list. Each card shows the sample text in a `<pre>` block with a checkbox. Below the cards: "Add selected" button (disabled when nothing selected or `addingSelected`).

---

## File Structure

| File | Change |
|------|--------|
| `app/api/style/generate-samples/route.ts` | Create — POST endpoint, calls Claude, returns 3 raw samples |
| `app/(owner)/style-profile/page.tsx` | Modify — generate button, pending sample cards, add-selected flow |

No schema changes. No new env vars (uses existing `ANTHROPIC_API_KEY`).

---

## Out of Scope

- Regenerating individual samples
- Controlling how many samples are generated
- Saving samples that weren't selected
- Showing a diff between existing examples and generated ones
