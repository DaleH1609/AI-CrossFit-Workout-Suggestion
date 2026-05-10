'use client'
import { useRef } from 'react'
import type { WorkoutDay } from '@/lib/types'

interface Props {
  workout: WorkoutDay | null
  gymName: string
}

const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

function todayName() {
  const d = new Date().getDay() // 0=Sun
  const monBased = d === 0 ? 6 : d - 1
  return DAY_NAMES[monBased]
}

export function WodCardClient({ workout, gymName }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const today = todayName()

  async function handleShare() {
    const text = workout
      ? `Today's WOD at ${gymName} — ${today}\n\n${workout.description ?? ''}`
      : `WOD at ${gymName} — ${today}`

    if (navigator.share) {
      await navigator.share({ title: `WOD — ${today}`, text }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text).catch(() => {})
      alert('Copied to clipboard!')
    }
  }

  const sections: { label: string; content: string }[] = []
  if (workout) {
    if (workout.warmup) sections.push({ label: 'Warm-up', content: workout.warmup })
    if (workout.strength) sections.push({ label: 'Strength', content: workout.strength })
    if (workout.wod) sections.push({ label: 'WOD', content: workout.wod })
    if (workout.notes) sections.push({ label: 'Notes', content: workout.notes })
    // fallback if using description field
    if (sections.length === 0 && workout.description) {
      sections.push({ label: 'WOD', content: workout.description })
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="font-display text-2xl text-foreground mb-6">Today&apos;s WOD Card</h1>

      {/* The card — optimised for screenshot */}
      <div
        ref={cardRef}
        className="rounded-2xl border-2 border-accent bg-background overflow-hidden shadow-lg"
      >
        {/* Header */}
        <div className="bg-accent px-6 py-4">
          <p className="text-background/70 text-xs uppercase tracking-widest font-semibold">{gymName}</p>
          <p className="font-display text-background text-2xl leading-tight mt-0.5">{today}&apos;s WOD</p>
          <p className="text-background/60 text-xs mt-1">
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {!workout || sections.length === 0 ? (
            <p className="text-secondary text-sm italic">No workout published for today.</p>
          ) : (
            <div className="space-y-4">
              {sections.map(s => (
                <div key={s.label}>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-accent mb-1">{s.label}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{s.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer watermark */}
        <div className="px-6 pb-4">
          <p className="text-[10px] text-secondary/50 uppercase tracking-widest">Powered by Kova</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={handleShare}
          className="w-full py-3 bg-accent text-background text-sm font-bold tracking-wider rounded-btn hover:bg-accent-90 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share this WOD
        </button>
        <p className="text-center text-xs text-secondary">Screenshot the card above to share on Instagram Stories</p>
      </div>
    </div>
  )
}
