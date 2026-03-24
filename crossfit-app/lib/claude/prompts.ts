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
