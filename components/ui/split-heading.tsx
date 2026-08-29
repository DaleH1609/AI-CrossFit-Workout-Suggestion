'use client'
import { ReactNode, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

/**
 * Headline animation using GSAP SplitText.
 *
 * My earlier RevealText took explicit line arrays and animated whole lines,
 * because splitting text in the DOM by hand breaks on resize and mangles
 * screen-reader output. SplitText solves both properly: it re-splits on
 * resize, and `aria: 'auto'` keeps the original string as the accessible name
 * so assistive tech never sees the per-character spans.
 *
 * Characters rise out of a masked line box on a stagger, which is why the
 * text appears to be revealed by something rather than simply fading in.
 */
export function SplitHeading({
  children,
  className,
  as: Tag = 'h2',
  immediate = false,
  delay = 0,
  stagger = 0.018,
}: {
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3'
  /** Play on mount rather than on scroll — for above-the-fold headings. */
  immediate?: boolean
  delay?: number
  stagger?: number
}) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger, SplitText)

    let split: SplitText | null = null
    const ctx = gsap.context(() => {
      split = SplitText.create(el, {
        type: 'lines,chars',
        // Wrapping lines in a masking element is what produces the "rising out
        // of nowhere" read rather than a plain upward fade.
        mask: 'lines',
        linesClass: 'overflow-hidden',
        autoSplit: true,
        aria: 'auto',
      })

      gsap.from(split.chars, {
        yPercent: 115,
        duration: 0.9,
        ease: 'expo.out',
        stagger,
        delay,
        ...(immediate
          ? {}
          : { scrollTrigger: { trigger: el, start: 'top 85%', once: true } }),
      })
    }, el)

    return () => {
      split?.revert()
      ctx.revert()
    }
  }, [immediate, delay, stagger])

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
