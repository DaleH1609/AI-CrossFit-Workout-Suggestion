'use client'
import { ReactNode, useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * Wraps a child so it drifts toward the cursor on hover and springs back on
 * exit. Applied to marketing CTAs only — the pull would fight a tap target in
 * the booking flow.
 *
 * The label counter-moves at a fraction of the container's offset, which is
 * what separates this from a plain translate: the button leads, the text trails.
 */
export function Magnetic({
  children,
  strength = 0.3,
  className,
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const label = labelRef.current
    if (!wrap || !label) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const wrapX = gsap.quickTo(wrap, 'x', { duration: 0.45, ease: 'power3.out' })
    const wrapY = gsap.quickTo(wrap, 'y', { duration: 0.45, ease: 'power3.out' })
    const lblX = gsap.quickTo(label, 'x', { duration: 0.6, ease: 'power3.out' })
    const lblY = gsap.quickTo(label, 'y', { duration: 0.6, ease: 'power3.out' })

    const onMove = (e: MouseEvent) => {
      const r = wrap.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      wrapX(dx * strength)
      wrapY(dy * strength)
      lblX(dx * strength * 0.35)
      lblY(dy * strength * 0.35)
    }
    const onLeave = () => { wrapX(0); wrapY(0); lblX(0); lblY(0) }

    // Listen on the parent so the pull begins slightly before the cursor
    // actually crosses the button edge.
    const zone = wrap.parentElement ?? wrap
    zone.addEventListener('mousemove', onMove)
    zone.addEventListener('mouseleave', onLeave)
    return () => {
      zone.removeEventListener('mousemove', onMove)
      zone.removeEventListener('mouseleave', onLeave)
      gsap.killTweensOf([wrap, label])
    }
  }, [strength])

  return (
    <span ref={wrapRef} className={`inline-block will-change-transform ${className ?? ''}`}>
      <span ref={labelRef} className="inline-block will-change-transform">
        {children}
      </span>
    </span>
  )
}
