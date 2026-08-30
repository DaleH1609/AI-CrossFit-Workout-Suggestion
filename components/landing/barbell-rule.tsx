'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Barbell } from '@phosphor-icons/react'

/**
 * A barbell that spins with the scroll — direction and speed follow the wheel,
 * with inertia so it keeps turning briefly after you stop. Used as a section
 * rule rather than decoration: it marks the seam between chapters of the page.
 */
export function BarbellRule({ label }: { label?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)

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

        {/* Phosphor's Barbell rather than the seven hand-placed rects this used
            to be. The hand-drawn version read as clip-art beside type set in a
            real typeface; a professionally drawn icon does not, and it inherits
            currentColor so it stays on the accent token. The wrapper is what
            spins, since Phosphor renders its own svg. */}
        <span
          ref={barRef}
          aria-hidden="true"
          className="flex-shrink-0 text-accent inline-flex"
          style={{ transformOrigin: 'center' }}
        >
          <Barbell size={48} weight="fill" />
        </span>

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
