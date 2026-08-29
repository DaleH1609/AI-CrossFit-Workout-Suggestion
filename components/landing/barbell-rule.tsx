'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * A barbell that spins with the scroll — direction and speed follow the wheel,
 * with inertia so it keeps turning briefly after you stop. Used as a section
 * rule rather than decoration: it marks the seam between chapters of the page.
 */
export function BarbellRule({ label }: { label?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<SVGGElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const bar = barRef.current
    if (!wrap || !bar) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger)

    let rotation = 0
    let velocity = 0
    let raf = 0
    let running = false

    const st = ScrollTrigger.create({
      trigger: wrap,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        // getVelocity is px/sec and signed — scale it to a sane spin rate.
        velocity += self.getVelocity() * 0.00035
        start()
      },
    })

    const tick = () => {
      rotation += velocity
      velocity *= 0.94 // inertia / friction
      bar.style.transform = `rotate(${rotation}deg)`
      // Settle to rest instead of drifting forever: a perpetual decorative loop
      // is autoplay motion with no stop control, and burns a frame budget
      // whether or not anyone is looking at it.
      if (Math.abs(velocity) < 0.01) {
        velocity = 0
        running = false
        return
      }
      raf = requestAnimationFrame(tick)
    }

    function start() {
      if (running) return
      running = true
      raf = requestAnimationFrame(tick)
    }

    return () => {
      st.kill()
      cancelAnimationFrame(raf)
      running = false
    }
  }, [])

  return (
    <div ref={wrapRef} className="relative bg-[#0B0B0C] py-14 overflow-hidden">
      <div className="mx-auto max-w-7xl px-8 flex items-center gap-8">
        <span className="h-px flex-1 bg-white/10" />

        <svg
          viewBox="-60 -60 120 120"
          aria-hidden="true"
          className="w-16 h-16 flex-shrink-0 overflow-visible"
        >
          <g ref={barRef} style={{ transformOrigin: 'center', transformBox: 'fill-box' }}>
            {/* shaft */}
            <rect x="-46" y="-3" width="92" height="6" rx="3" fill="var(--color-accent)" />
            {/* inner collars */}
            <rect x="-32" y="-8" width="5" height="16" rx="1.5" fill="var(--color-accent)" opacity="0.7" />
            <rect x="27" y="-8" width="5" height="16" rx="1.5" fill="var(--color-accent)" opacity="0.7" />
            {/* plates */}
            <rect x="-46" y="-22" width="11" height="44" rx="3" fill="var(--color-accent)" />
            <rect x="35" y="-22" width="11" height="44" rx="3" fill="var(--color-accent)" />
            <rect x="-56" y="-14" width="8" height="28" rx="2.5" fill="var(--color-accent)" opacity="0.55" />
            <rect x="48" y="-14" width="8" height="28" rx="2.5" fill="var(--color-accent)" opacity="0.55" />
          </g>
        </svg>

        {label ? (
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-white/30 flex-shrink-0">
            {label}
          </span>
        ) : null}
        <span className="h-px flex-1 bg-white/10" />
      </div>
    </div>
  )
}
