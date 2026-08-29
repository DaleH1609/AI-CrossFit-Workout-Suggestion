'use client'

import { ScrollVelocityRow } from '@/components/ui/scroll-velocity-text'

/**
 * Movement strip. Speed and direction follow scroll velocity, so it behaves
 * like the barbell rule further down the page rather than looping on a timer.
 *
 * Two rows running opposite directions, which reads as texture rather than as
 * a banner asking to be read.
 *
 * No emoji: 3.D bans them in UI chrome, and a marquee of glyphs renders
 * differently on every platform.
 */

const ROW_A = [
  'Clean & Jerk', 'Back Squat', 'Snatch', 'Thruster', 'Deadlift',
  'Muscle-up', 'Wall Ball', 'Box Jump', 'Toes-to-bar',
]

const ROW_B = [
  'AMRAP', 'EMOM', 'For Time', 'Metcon', 'Hero WOD',
  'Chipper', 'Ladder', 'Tabata', 'Rx / Scaled / Beginner',
]

function Pill({ label }: { label: string }) {
  return (
    <span className="mx-2 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/55">
      {label}
    </span>
  )
}

export function MovementMarquee() {
  return (
    <div className="bg-[#0B0B0C] py-14 overflow-hidden" aria-hidden="true">
      <ScrollVelocityRow baseVelocity={1.6} direction={1} className="mb-3">
        {ROW_A.map((m) => <Pill key={m} label={m} />)}
      </ScrollVelocityRow>
      <ScrollVelocityRow baseVelocity={1.6} direction={-1}>
        {ROW_B.map((m) => <Pill key={m} label={m} />)}
      </ScrollVelocityRow>
    </div>
  )
}
