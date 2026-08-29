'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Counts a number up when it scrolls into view, once.
 *
 * The value is rendered server-side at its final state, so the number is
 * correct with JS disabled, correct for screen readers, and never flashes a
 * zero. The animation only overwrites it once ScrollTrigger fires.
 *
 * Digits are tabular so the element does not reflow as values change width —
 * the usual reason counters look cheap.
 */
export function CountUp({
  to,
  prefix = '',
  suffix = '',
  duration = 1.6,
  className,
}: {
  to: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger)
    const counter = { v: 0 }

    const ctx = gsap.context(() => {
      gsap.to(counter, {
        v: to,
        duration,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onStart: () => { el.textContent = `${prefix}0${suffix}` },
        onUpdate: () => { el.textContent = `${prefix}${Math.round(counter.v)}${suffix}` },
        onComplete: () => { el.textContent = `${prefix}${to}${suffix}` },
      })
    }, el)

    return () => ctx.revert()
  }, [to, prefix, suffix, duration])

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ''}`}>
      {prefix}{to}{suffix}
    </span>
  )
}
