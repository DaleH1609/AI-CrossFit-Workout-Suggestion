'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'

/**
 * Scroll-driven clean & jerk.
 *
 * The athlete is a joint skeleton, not a sprite sequence — each phase below is a
 * set of joint coordinates, and scroll progress lerps between adjacent phases.
 * That keeps the movement continuous at any scroll speed and any frame rate.
 *
 * Coordinate space is the 400×500 viewBox. Ground sits at y=460; the barbell
 * plate radius is 42, so a bar resting on the floor has its centre at y=418.
 */

type Pose = {
  label: string
  ankle: [number, number]
  knee: [number, number]
  hip: [number, number]
  shoulder: [number, number]
  elbow: [number, number]
  wrist: [number, number] // the bar rides here
  head: [number, number]
  backAnkle: [number, number]
  backKnee: [number, number]
  /** Barbell whip — plates flex under load. Degrees. */
  barBend: number
}

const PHASES: Pose[] = [
  {
    label: 'Setup',
    ankle: [200, 460], knee: [215, 385], hip: [170, 330],
    shoulder: [215, 240], elbow: [220, 329], wrist: [225, 418],
    head: [222, 205], backAnkle: [186, 460], backKnee: [203, 385],
    barBend: 0,
  },
  {
    label: 'First pull',
    ankle: [200, 460], knee: [213, 383], hip: [172, 310],
    shoulder: [218, 215], elbow: [220, 300], wrist: [222, 385],
    head: [225, 180], backAnkle: [186, 460], backKnee: [201, 383],
    barBend: 6,
  },
  {
    label: 'Triple extension',
    ankle: [200, 462], knee: [203, 378], hip: [200, 295],
    shoulder: [205, 180], elbow: [206, 240], wrist: [208, 300],
    head: [208, 143], backAnkle: [186, 462], backKnee: [191, 378],
    barBend: 10,
  },
  {
    label: 'Catch',
    ankle: [200, 460], knee: [232, 375], hip: [188, 368],
    shoulder: [196, 255], elbow: [232, 262], wrist: [206, 238],
    head: [196, 215], backAnkle: [186, 460], backKnee: [218, 375],
    barBend: 8,
  },
  {
    label: 'Stand',
    ankle: [200, 460], knee: [200, 378], hip: [200, 300],
    shoulder: [200, 192], elbow: [236, 205], wrist: [210, 178],
    head: [200, 152], backAnkle: [186, 460], backKnee: [188, 378],
    barBend: 3,
  },
  {
    label: 'Dip',
    ankle: [200, 460], knee: [206, 382], hip: [200, 330],
    shoulder: [200, 222], elbow: [236, 235], wrist: [210, 208],
    head: [200, 182], backAnkle: [186, 460], backKnee: [194, 382],
    barBend: 7,
  },
  {
    label: 'Drive',
    ankle: [200, 460], knee: [215, 385], hip: [200, 315],
    shoulder: [200, 205], elbow: [208, 160], wrist: [204, 120],
    head: [200, 168], backAnkle: [168, 461], backKnee: [180, 392],
    barBend: 9,
  },
  {
    label: 'Lockout',
    ankle: [212, 460], knee: [222, 382], hip: [202, 318],
    shoulder: [202, 200], elbow: [203, 150], wrist: [204, 100],
    head: [202, 163], backAnkle: [150, 462], backKnee: [168, 400],
    barBend: 4,
  },
  {
    label: 'Recover',
    ankle: [200, 460], knee: [200, 378], hip: [200, 298],
    shoulder: [200, 188], elbow: [200, 140], wrist: [200, 92],
    head: [200, 152], backAnkle: [186, 460], backKnee: [188, 378],
    barBend: 2,
  },
]

const JOINTS = [
  'ankle', 'knee', 'hip', 'shoulder', 'elbow', 'wrist', 'head', 'backAnkle', 'backKnee',
] as const

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function poseAt(progress: number): Pose {
  const scaled = progress * (PHASES.length - 1)
  const i = Math.min(Math.floor(scaled), PHASES.length - 2)
  const t = scaled - i
  // Ease within each phase so the lift breathes instead of moving linearly.
  const e = t * t * (3 - 2 * t)
  const from = PHASES[i]
  const to = PHASES[i + 1]

  const out = { label: e < 0.5 ? from.label : to.label } as Pose
  for (const j of JOINTS) {
    out[j] = [lerp(from[j][0], to[j][0], e), lerp(from[j][1], to[j][1], e)]
  }
  out.barBend = lerp(from.barBend, to.barBend, e)
  return out
}

export function CleanAndJerk() {
  const sectionRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  // Written to imperatively — a setState per scroll frame would re-render the
  // whole section 60 times a second for what is only ever text and a width.
  const labelRef = useRef<HTMLSpanElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const svg = svgRef.current
    const section = sectionRef.current
    if (!svg || !section) return

    const el = (id: string) => svg.querySelector<SVGElement>(`#${id}`)
    const parts = {
      torso: el('cj-torso'), frontLeg: el('cj-front-leg'), backLeg: el('cj-back-leg'),
      arm: el('cj-arm'), head: el('cj-head'), bar: el('cj-bar'),
      plateL: el('cj-plate-l'), plateR: el('cj-plate-r'), path: el('cj-bar-path'),
    }

    const trail: string[] = []

    const render = (progress: number) => {
      const p = poseAt(progress)
      const pt = (j: (typeof JOINTS)[number]) => `${p[j][0]},${p[j][1]}`

      parts.frontLeg?.setAttribute('points', `${pt('ankle')} ${pt('knee')} ${pt('hip')}`)
      parts.backLeg?.setAttribute('points', `${pt('backAnkle')} ${pt('backKnee')} ${pt('hip')}`)
      parts.torso?.setAttribute('points', `${pt('hip')} ${pt('shoulder')}`)
      parts.arm?.setAttribute('points', `${pt('shoulder')} ${pt('elbow')} ${pt('wrist')}`)
      parts.head?.setAttribute('cx', String(p.head[0]))
      parts.head?.setAttribute('cy', String(p.head[1]))

      const [bx, by] = p.wrist
      parts.bar?.setAttribute('d', `M ${bx - 92} ${by + p.barBend} Q ${bx} ${by - p.barBend} ${bx + 92} ${by + p.barBend}`)
      parts.plateL?.setAttribute('cx', String(bx - 78)); parts.plateL?.setAttribute('cy', String(by + p.barBend * 0.8))
      parts.plateR?.setAttribute('cx', String(bx + 78)); parts.plateR?.setAttribute('cy', String(by + p.barBend * 0.8))

      // Bar path trace — the signature of a good lift is a near-vertical bar path.
      trail.push(`${bx},${by}`)
      if (trail.length > 90) trail.shift()
      parts.path?.setAttribute('points', trail.join(' '))

      const pct = Math.round(progress * 100)
      if (labelRef.current) labelRef.current.textContent = p.label
      if (pctRef.current) pctRef.current.textContent = String(pct).padStart(2, '0')
      if (barRef.current) barRef.current.style.width = `${pct}%`
    }

    if (reduced) {
      // Show the lockout — the payoff frame — without any scroll binding.
      render(7 / (PHASES.length - 1))
      return
    }

    gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin)
    // Floor line draws itself in as the section arrives — DrawSVG animates the
    // stroke dash offset, which is a real line being drawn rather than a
    // rectangle scaling up.
    const floor = section.querySelector('#cj-floor')
    if (floor) {
      gsap.fromTo(floor, { drawSVG: '50% 50%' }, {
        drawSVG: '0% 100%',
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: { trigger: section, start: 'top 75%', once: true },
      })
    }

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=2600',
      pin: true,
      scrub: 0.9,
      onUpdate: (self) => render(self.progress),
    })
    render(0)

    return () => { st.kill() }
  }, [])

  return (
    <section
      ref={sectionRef}
      aria-label="Clean and jerk, animated through the phases of the lift as you scroll"
      className="relative min-h-[100dvh] overflow-hidden bg-[#0B0B0C] flex items-center"
    >
      {/* Floor line - an SVG path so DrawSVG can stroke it on, not a div. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-1/2 mt-[92px] w-full"
        height="2"
        preserveAspectRatio="none"
        viewBox="0 0 1000 2"
      >
        <line id="cj-floor" x1="0" y1="1" x2="1000" y2="1" stroke="white" strokeOpacity="0.14" strokeWidth="2" />
      </svg>

      <div className="relative mx-auto w-full max-w-7xl px-8 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center">
        <div className="max-w-lg">
          <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent mb-6">
            The lift
          </p>
          <h2 className="font-display uppercase text-white leading-[0.85] tracking-tight text-[clamp(2.5rem,6vw,5rem)]">
            Built for<br />the barbell
          </h2>
          <p className="mt-8 text-white/50 leading-relaxed max-w-sm">
            Olympic lifts, metcons, hero WODs, Hyrox. KOVA knows the difference between
            a strength day and a engine day - and programs the week accordingly.
          </p>

          <div className="mt-10 flex items-baseline gap-4">
            <span ref={pctRef} className="font-display text-5xl text-accent tabular-nums">00</span>
            <span ref={labelRef} className="font-mono text-[11px] tracking-[0.3em] uppercase text-white/40">
              {PHASES[0].label}
            </span>
          </div>
          <div className="mt-4 h-px w-full max-w-xs bg-white/10 relative">
            <div ref={barRef} className="absolute inset-y-0 left-0 bg-accent" style={{ width: '0%' }} />
          </div>
        </div>

        <svg
          ref={svgRef}
          viewBox="0 0 400 500"
          role="img"
          aria-hidden="true"
          className="w-full max-w-[460px] mx-auto lg:mx-0 h-auto"
        >
          {/* Bar path trace */}
          <polyline
            id="cj-bar-path"
            fill="none"
            stroke="var(--color-accent)"
            strokeOpacity="0.35"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Athlete */}
          <g
            fill="none"
            stroke="white"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline id="cj-back-leg" strokeOpacity="0.4" />
            <polyline id="cj-front-leg" />
            <polyline id="cj-torso" />
            <polyline id="cj-arm" />
            <circle id="cj-head" r="17" fill="white" stroke="none" />
          </g>
          {/* Barbell */}
          <path
            id="cj-bar"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle id="cj-plate-l" r="26" fill="var(--color-accent)" />
          <circle id="cj-plate-r" r="26" fill="var(--color-accent)" />
        </svg>
      </div>
    </section>
  )
}
