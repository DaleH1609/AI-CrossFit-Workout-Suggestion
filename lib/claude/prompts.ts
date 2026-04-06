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
