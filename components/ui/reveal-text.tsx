'use client'
import { ReactNode, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Line-mask headline reveal — each line sits in an overflow-hidden track and
 * rises from below on a stagger.
 *
 * Lines are passed explicitly rather than split out of a text node at runtime:
 * DOM text-splitting breaks ligatures and screen-reader flow, and re-splitting
 * on resize is a reflow hazard. The mask is purely presentational, so the
 * accessible name still comes from the real text.
 */
export function RevealText({
  lines,
  as: Tag = 'h2',
  className,
  lineClassName,
  delay = 0,
  immediate = false,
}: {
  lines: ReactNode[]
  as?: 'h1' | 'h2' | 'h3' | 'div'
  className?: string
  lineClassName?: string
  /** Seconds before the stagger begins. */
  delay?: number
  /** Play on mount instead of waiting for scroll — use for above-the-fold. */
  immediate?: boolean
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const targets = root.querySelectorAll('[data-reveal-line]')
    if (!targets.length) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(targets, { yPercent: 0, opacity: 1 })
      return
    }

    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.to(targets, {
        yPercent: 0,
        opacity: 1,
        duration: 1.05,
        delay,
        ease: 'expo.out',
        stagger: 0.09,
        ...(immediate
          ? {}
          : { scrollTrigger: { trigger: root, start: 'top 82%', once: true } }),
      })
    }, root)

    return () => ctx.revert()
  }, [delay, immediate])

  return (
    // @ts-expect-error — polymorphic tag, ref type varies with Tag
    <Tag ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <span
            data-reveal-line
            className={`block will-change-transform ${lineClassName ?? ''}`}
            style={{ transform: 'translateY(110%)', opacity: 0 }}
          >
            {line}
          </span>
        </span>
      ))}
    </Tag>
  )
}
