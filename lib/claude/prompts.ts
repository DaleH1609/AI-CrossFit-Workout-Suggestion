// lib/claude/prompts.ts
import type { WorkoutWeek } from '@/lib/types'

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

export function buildGenerationPrompt(
  styleExamples: string[],
  history: WorkoutWeek[],
  gymType: 'crossfit' | 'hyrox' = 'crossfit'
): string {
  const historyText = history.length === 0
    ? 'No previous weeks — this is the first week.'
    : history.map((week, i) => `Week ${i + 1}:\n${JSON.stringify(week, null, 2)}`).join('\n\n')

  const outputRequirements = `## Output Requirements
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

  if (styleExamples.length >= 3) {
    const examplesText = styleExamples.join('\n\n---\n\n')
    return `You are a CrossFit programming coach. Generate a new Mon–Fri workout week that matches the style of the examples below.

## Style Examples (match this format exactly)
${examplesText}

## Previous Weeks (build progressively — do not repeat primary movements on back-to-back days)
${historyText}

${outputRequirements}

Rules:
- Follow the exact same formatting conventions as the examples (minute markers, time caps, sets x reps notation)
- Do not repeat the same primary barbell movement on consecutive days
- Vary movement patterns across the week (push/pull/hinge/squat)
- Keep the same day types as the examples (Mon/Fri = interval, Wed = strength, Thu = partner, Tue = for time)`
  }

  const builtinPrompt = gymType === 'hyrox' ? HYROX_BUILTIN : CROSSFIT_BUILTIN

  return `${builtinPrompt}

## Previous Weeks (build progressively — do not repeat primary movements on back-to-back days)
${historyText}

${outputRequirements}

Rules:
- Do not repeat the same primary movement on consecutive days
- Vary movement patterns across the week
- Keep appropriate time domains and loading for the gym type`
}
