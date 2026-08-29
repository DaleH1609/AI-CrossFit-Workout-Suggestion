'use client'
import { useState, useEffect, useRef } from 'react'

const STEPS = [
  {
    num: '01',
    title: 'Generate',
    benefit: 'AI writes your full week in under 30 seconds',
  },
  {
    num: '02',
    title: 'Review & Edit',
    benefit: 'Tweak any workout before it goes live',
  },
  {
    num: '03',
    title: 'Publish',
    benefit: 'One tap — members see it instantly',
  },
]

const WOD_ROWS = [
  { day: 'Mon', name: 'Back Squat 5×5 + AMRAP 15', tag: 'Strength' },
  { day: 'Tue', name: '21-15-9 Thrusters / Pull-ups', tag: 'Metcon' },
  { day: 'Wed', name: 'EMOM 20 — Gymnastics Focus', tag: 'Skill' },
  { day: 'Thu', name: 'Clean & Jerk 1RM + RFT', tag: 'Olympic' },
  { day: 'Fri', name: 'Hero WOD — Murph Prep', tag: 'Endurance' },
]

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function PanelGenerate() {
  return (
    <div className="h-full flex flex-col p-6 bg-surface rounded-card border border-border">
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-bold tracking-widest text-accent uppercase">This Week · Mon–Fri</span>
        <span className="flex items-center gap-1.5 text-xs text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse flex-shrink-0" />
          Generating…
        </span>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {WOD_ROWS.map((row, i) => (
          <div
            key={row.day}
            className="wod-row-in flex items-center gap-3 px-3 py-2.5 bg-background border border-border rounded-btn"
            style={{ animationDelay: `${i * 0.2}s`, opacity: 0 }}
          >
            <span className="text-xs font-bold text-accent w-6 flex-shrink-0">{row.day}</span>
            <span className="text-xs text-foreground flex-1">{row.name}</span>
            <span className="text-xs text-secondary bg-surface border border-border px-2 py-0.5 rounded flex-shrink-0">{row.tag}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border flex items-center gap-1.5">
        <span className="ai-cursor" />
        <span className="text-xs text-secondary">AI generating your week</span>
      </div>
    </div>
  )
}

function PanelReview() {
  return (
    <div className="h-full flex flex-col p-6 bg-surface rounded-card border border-border">
      <div className="flex gap-1 mb-5">
        {WEEK_DAYS.map((day, i) => (
          <button
            key={day}
            className={`px-3 py-1.5 text-xs font-semibold rounded-btn transition-colors ${
              i === 0
                ? 'bg-accent text-background'
                : 'text-secondary hover:text-foreground'
            }`}
          >
            {day}
          </button>
        ))}
      </div>
      <div className="bg-background border border-border rounded-card p-4 mb-4">
        <div className="text-xs font-bold tracking-widest text-accent uppercase mb-1">Monday — Strength</div>
        <div className="text-lg font-bold text-foreground mb-1">Back Squat 5×5</div>
        <div className="text-sm text-secondary">@ 80% 1RM · 3 min rest</div>
      </div>
      <div className="mb-4">
        <div className="text-xs text-secondary uppercase tracking-widest mb-2">Scaling Versions</div>
        <div className="flex gap-2">
          <span className="px-3 py-1 text-xs font-semibold rounded-btn bg-accent-10 text-accent border border-accent">Rx</span>
          <span className="px-3 py-1 text-xs font-semibold rounded-btn bg-surface border border-border text-secondary">Scaled</span>
          <span className="px-3 py-1 text-xs font-semibold rounded-btn bg-surface border border-border text-secondary">Beginner</span>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between">
        <button className="px-4 py-2 text-xs font-bold tracking-widest uppercase rounded-btn bg-accent text-background">
          Save Changes
        </button>
        <span className="text-xs text-secondary">← Mon&nbsp;&nbsp;Wed →</span>
      </div>
    </div>
  )
}

function PanelPublish() {
  return (
    <div className="h-full flex flex-col p-6 bg-surface rounded-card border border-border">
      <div className="grid grid-cols-5 gap-2 flex-1">
        {WEEK_DAYS.map((day, i) => (
          <div
            key={day}
            className="cell-fade-in relative bg-background border border-border rounded-btn p-3"
            style={{ animationDelay: `${i * 0.2}s`, opacity: 0 }}
          >
            <div className="text-xs font-bold text-accent mb-2">{day}</div>
            <div className="h-2 bg-accent-10 rounded mb-1.5" />
            <div className="h-2 bg-surface-raised rounded" />
            <span aria-hidden="true" className="absolute top-2 right-2 text-xs text-success">✓</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border">
        <span className="text-xs text-secondary">
          5 WODs published · 15 Scaling versions ·{' '}
          <span className="text-accent">Live to members ↗</span>
        </span>
      </div>
    </div>
  )
}

const PANELS = [<PanelGenerate key="generate" />, <PanelReview key="review" />, <PanelPublish key="publish" />]

export function WodWalkthrough() {
  const [active, setActive] = useState(0)
  const sent1 = useRef<HTMLDivElement>(null)
  const sent2 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Sentinel 1: crossing into step 2
    const obs1 = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setActive(1)
      else if (e.boundingClientRect.top > 0) setActive(0)  // exited from bottom = scrolled back up
    }, { threshold: 0 })

    // Sentinel 2: crossing into step 3
    const obs2 = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setActive(2)
      else if (e.boundingClientRect.top > 0) setActive(1)  // exited from bottom = scrolled back up
    }, { threshold: 0 })

    if (sent1.current) obs1.observe(sent1.current)
    if (sent2.current) obs2.observe(sent2.current)
    return () => { obs1.disconnect(); obs2.disconnect() }
  }, [])

  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-16"
      style={{ height: '550vh' }}
    >
      {/* Sentinel divs — absolute siblings of the sticky div, not inside it */}
      <div ref={sent1} style={{ position: 'absolute', top: '30%', height: '1px', width: '100%', pointerEvents: 'none' }} />
      <div ref={sent2} style={{ position: 'absolute', top: '60%', height: '1px', width: '100%', pointerEvents: 'none' }} />

      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
        <div className="max-w-6xl mx-auto w-full px-8 py-12">
          <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-4">How It Works</p>
          <h2 className="font-display text-4xl font-bold text-foreground tracking-tight mb-10">
            From idea to published<br />
            <span className="text-accent">in three steps.</span>
          </h2>

          <div className="flex gap-12 lg:gap-16">
            {/* Left: step list */}
            <div className="hidden lg:flex w-56 flex-shrink-0 flex-col gap-8">
              {STEPS.map((step, i) => (
                <div
                  key={step.num}
                  className={`border-l-2 pl-5 transition-all duration-300 ${
                    active === i ? 'border-accent' : 'border-transparent'
                  }`}
                >
                  <div className={`text-xs font-bold tracking-widest uppercase transition-colors duration-300 ${
                    active === i ? 'text-accent' : 'text-secondary'
                  }`}>
                    {step.num}
                  </div>
                  <div className="text-base font-bold text-foreground mt-1">{step.title}</div>
                  <div className="text-sm text-secondary mt-1">{step.benefit}</div>
                </div>
              ))}
            </div>

            {/* Right: panel container */}
            <div className="flex-1">
              <div className="relative h-[400px] lg:h-[440px]">
                {PANELS.map((panel, i) => (
                  <div
                    key={i}
                    className={`absolute inset-0 transition-all duration-500 ease-fluid ${
                      active === i
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-2 pointer-events-none'
                    }`}
                  >
                    {panel}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
