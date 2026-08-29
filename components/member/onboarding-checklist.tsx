'use client'
import { Confetti } from '@phosphor-icons/react'
// components/member/onboarding-checklist.tsx
// F11: First class onboarding checklist for new members
// F37: 6-class Intro to CrossFit progress

interface CompletedStep {
  step: string
  completed_at: string
}

interface Step {
  key: string
  label: string
  description: string
  selfServe: boolean  // can member mark this themselves vs. coach-only
  href?: string
}

const STEPS: Step[] = [
  { key: 'profile',       label: 'Complete your profile',     description: 'Add your name and update your preferences',   selfServe: true,  href: '/profile' },
  { key: 'waiver',        label: 'Sign the liability waiver', description: 'Required before your first class',             selfServe: false, href: '/profile' },
  { key: 'first_booking', label: 'Book your first class',     description: 'Find a time that works for you',               selfServe: false, href: '/my-schedule' },
  { key: 'intro_video',   label: 'Watch the intro video',     description: 'A quick orientation to get you ready',          selfServe: true },
]

const INTRO_CLASSES: Step[] = Array.from({ length: 6 }, (_, i) => ({
  key: `intro_class_${i + 1}`,
  label: `Intro Class ${i + 1}`,
  description: ['Foundational movements & safety', 'Squat mechanics', 'Pressing patterns', 'Hip hinge & deadlift', 'Olympic lifting intro', 'Benchmark WOD'][i],
  selfServe: false,
}))

const ALL_STEPS = [...STEPS, ...INTRO_CLASSES]

interface Props {
  completedSteps: CompletedStep[]
  waiverSignedAt: string | null
  hasBookings: boolean
}

function CheckCircle({ done }: { done: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
      done ? 'border-accent bg-accent' : 'border-border'
    }`}>
      {done && (
        <svg width="10" height="8" fill="none" viewBox="0 0 10 8">
          <path d="M1 4l3 3L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

export function OnboardingChecklist({ completedSteps, waiverSignedAt, hasBookings }: Props) {
  const completedSet = new Set(completedSteps.map(s => s.step))

  // Auto-detect completed steps from other data
  if (waiverSignedAt) completedSet.add('waiver')
  if (hasBookings) completedSet.add('first_booking')

  const totalDone = ALL_STEPS.filter(s => completedSet.has(s.key)).length
  const totalSteps = ALL_STEPS.length
  const pct = Math.round((totalDone / totalSteps) * 100)

  if (totalDone === totalSteps) {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent-5 p-5 text-center">
        <Confetti size={26} weight="duotone" className="mb-1 text-accent" />
        <p className="font-semibold text-foreground">Onboarding complete!</p>
        <p className="text-xs text-secondary mt-1">You've finished all 6 intro classes. Welcome to the box!</p>
      </div>
    )
  }

  const introCompleted = INTRO_CLASSES.filter(s => completedSet.has(s.key)).length

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Getting started</h3>
        <span className="text-xs text-secondary">{totalDone}/{totalSteps}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-border/30 rounded-full h-1.5 mb-5">
        <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* Core onboarding steps */}
      <div className="space-y-3 mb-5">
        {STEPS.map(step => {
          const done = completedSet.has(step.key)
          return (
            <div key={step.key} className={`flex items-center gap-3 ${done ? 'opacity-50' : ''}`}>
              <CheckCircle done={done} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${done ? 'line-through text-secondary' : 'text-foreground'}`}>{step.label}</p>
                <p className="text-[10px] text-secondary">{step.description}</p>
              </div>
              {!done && step.href && (
                <a href={step.href} className="text-xs text-accent hover:underline shrink-0">Go →</a>
              )}
            </div>
          )
        })}
      </div>

      {/* Intro CrossFit classes */}
      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3">
          Intro to CrossFit - {introCompleted}/6 classes
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {INTRO_CLASSES.map((cls, i) => {
            const done = completedSet.has(cls.key)
            return (
              <div key={cls.key} title={cls.description}
                className={`rounded-lg py-2 text-center text-xs font-bold border transition-colors ${
                  done ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-surface border-border text-secondary'
                }`}
              >
                {i + 1}
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-secondary mt-2">Your coach marks these as you complete each class</p>
      </div>
    </div>
  )
}
