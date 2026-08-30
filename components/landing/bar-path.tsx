'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { Path } from '@phosphor-icons/react'

/**
 * The bar path of a clean & jerk, drawn as you scroll.
 *
 * This replaces a stick-figure animation. The figure was competently built —
 * interpolated joints, real scrubbing — but a white outline of a person reads
 * as a wireframe placeholder rather than as something anyone designed.
 *
 * The bar path is what a coach actually looks at. A good lift keeps the bar
 * close and near-vertical; the S is the loop back under the body at the catch
 * and again at the dip. Drawing that is a diagram with something to say, which
 * is a stronger reason for an animation to exist than decoration.
 *
 * DrawSVG reveals the trace, MotionPath carries the barbell along the identical
 * path, so the marker can never drift off the line it is drawing.
 *
 * Coordinate space is the 400×520 viewBox. Floor sits at y=470.
 */

/** Height references a lifter would actually call out, as fractions of the box. */
const GUIDES = [
  { y: 470, label: 'Floor' },
  { y: 388, label: 'Knee' },
  { y: 300, label: 'Hip' },
  { y: 208, label: 'Shoulder' },
  { y: 96,  label: 'Overhead' },
]

/**
 * The trace itself. Back toward the lifter off the floor, forward through
 * triple extension, back under for the catch, then straight up on the jerk.
 */
const BAR_PATH =
  'M 205 428 C 196 400 188 372 190 344 C 193 312 210 292 214 268 C 217 240 200 222 197 208 C 194 196 197 190 197 184 C 197 196 196 206 196 216 C 196 190 200 150 199 120 C 199 108 199 100 199 96'

/** Where each phase sits along the path, 0–1, paired with its name. */
const PHASES: Array<{ at: number; label: string }> = [
  { at: 0.00, label: 'Setup' },
  { at: 0.14, label: 'First pull' },
  { at: 0.32, label: 'Triple extension' },
  { at: 0.48, label: 'Catch' },
  { at: 0.58, label: 'Stand' },
  { at: 0.68, label: 'Dip' },
  { at: 0.80, label: 'Drive' },
  { at: 0.94, label: 'Lockout' },
  { at: 1.00, label: 'Recover' },
]

function phaseAt(progress: number): string {
  let current = PHASES[0].label
  for (const p of PHASES) if (progress >= p.at) current = p.label
  return current
}

export function BarPath() {
  const sectionRef = useRef<HTMLElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const meterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const trace = section.querySelector<SVGPathElement>('#bp-trace')
    const bar = section.querySelector<SVGGElement>('#bp-bar')
    if (!trace || !bar) return

    // Place the phase dots on the trace itself rather than hand-authoring nine
    // more coordinate pairs that would silently drift the moment the path is
    // edited. getPointAtLength is the browser's own measurement of the same d.
    const total = trace.getTotalLength()
    section.querySelectorAll<SVGCircleElement>('[data-phase-dot]').forEach(dot => {
      const at = Number(dot.dataset.phaseAt)
      const pt = trace.getPointAtLength(at * total)
      dot.setAttribute('cx', String(pt.x))
      dot.setAttribute('cy', String(pt.y))
    })

    const paint = (progress: number) => {
      const pct = Math.round(progress * 100)
      if (labelRef.current) labelRef.current.textContent = phaseAt(progress)
      if (pctRef.current) pctRef.current.textContent = String(pct).padStart(2, '0')
      if (meterRef.current) meterRef.current.style.width = `${pct}%`
      section.querySelectorAll<SVGCircleElement>('[data-phase-at]').forEach(dot => {
        const at = Number(dot.dataset.phaseAt)
        dot.setAttribute('opacity', progress >= at ? '1' : '0.22')
      })
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin)

    if (reduced) {
      // Show the finished trace with the bar locked out — the payoff frame,
      // with nothing bound to scroll.
      gsap.set(trace, { drawSVG: '0% 100%' })
      gsap.set(bar, { motionPath: { path: trace, align: trace, alignOrigin: [0.5, 0.5], start: 1, end: 1 } })
      paint(1)
      return
    }

    gsap.set(trace, { drawSVG: '0% 0%' })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=2400',
        pin: true,
        scrub: 0.8,
        onUpdate: self => paint(self.progress),
      },
    })

    tl.to(trace, { drawSVG: '0% 100%', ease: 'none' }, 0)
      .to(bar, {
        motionPath: { path: trace, align: trace, alignOrigin: [0.5, 0.5], start: 0, end: 1 },
        ease: 'none',
      }, 0)

    paint(0)

    return () => {
      tl.scrollTrigger?.kill()
      tl.kill()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      aria-label="The bar path of a clean and jerk, traced as you scroll"
      className="relative min-h-[100dvh] overflow-hidden bg-[#0B0B0C] flex items-center"
    >
      <div className="relative w-full max-w-6xl mx-auto px-6 grid gap-12 md:grid-cols-2 items-center">

        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-accent mb-5">
            <Path size={14} weight="bold" aria-hidden="true" />
            The bar path
          </p>

          <h2 className="font-display uppercase text-white leading-[0.84] tracking-[-0.02em] text-[clamp(2.2rem,5vw,3.6rem)] mb-6">
            A good lift is
            <br />
            <span className="text-accent">a straight line.</span>
          </h2>

          <p className="text-white/45 text-base max-w-[42ch] mb-10">
            Coaches read the trace, not the lifter. The bar stays close to the
            body, loops back under at the catch, and finishes overhead — every
            centimetre forward is force going somewhere other than up.
          </p>

          <div className="flex items-baseline gap-4 mb-3">
            <span ref={pctRef} className="font-display text-accent text-5xl tabular-nums leading-none">00</span>
            <span ref={labelRef} className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/60">Setup</span>
          </div>
          <div className="h-px w-full max-w-sm bg-white/10" aria-hidden="true">
            <div ref={meterRef} className="h-px bg-accent" style={{ width: '0%' }} />
          </div>
        </div>

        <div className="relative">
          <svg viewBox="0 0 400 520" className="w-full max-w-[420px] mx-auto" role="img"
               aria-label="Diagram of the barbell's path from floor to overhead">
            {GUIDES.map(g => (
              <g key={g.label}>
                <line x1="92" y1={g.y} x2="366" y2={g.y}
                      stroke="white" strokeOpacity="0.10" strokeWidth="1" strokeDasharray="2 6" />
                <text x="82" y={g.y + 4} textAnchor="end"
                      className="font-mono" fontSize="10" fill="white" fillOpacity="0.34"
                      letterSpacing="1.5">{g.label.toUpperCase()}</text>
              </g>
            ))}

            {/* Ghost of the full path, so the drawn portion reads as progress. */}
            <path d={BAR_PATH} fill="none" stroke="white" strokeOpacity="0.10" strokeWidth="2" />
            <path id="bp-trace" d={BAR_PATH} fill="none" stroke="var(--color-accent)"
                  strokeWidth="2.5" strokeLinecap="round" />

            {PHASES.map(p => {
              // Dots are positioned by the browser along the same path at mount.
              return (
                <circle key={p.label} data-phase-at={p.at} r="3.5"
                        fill="var(--color-accent)" opacity="0.22"
                        cx="0" cy="0" data-phase-dot="" />
              )
            })}

            <g id="bp-bar">
              <line x1="-34" y1="0" x2="34" y2="0" stroke="white" strokeWidth="3" strokeLinecap="round" />
              <circle cx="-28" cy="0" r="11" fill="var(--color-accent)" />
              <circle cx="28" cy="0" r="11" fill="var(--color-accent)" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  )
}
