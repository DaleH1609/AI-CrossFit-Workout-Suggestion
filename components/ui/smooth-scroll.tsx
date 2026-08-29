'use client'
import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'

/**
 * GSAP ScrollSmoother — decouples scrolling from the browser's native
 * behaviour and drives it with inertia. This is the single biggest reason
 * expensive sites feel expensive: native scroll is 1:1 with the wheel, so it
 * feels light and digital; smoothed scroll carries weight and settles.
 *
 * Requires the #smooth-wrapper / #smooth-content DOM pair, which this
 * component expects to already exist around the page content.
 *
 * Deliberately NOT enabled on touch devices. Mobile browsers hand scrolling to
 * the compositor thread; hijacking it costs the address-bar collapse, rubber
 * banding and momentum that people expect, and usually feels worse, not
 * better. `smoothTouch: 0` keeps native behaviour there.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger, ScrollSmoother)

    const smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      // Seconds taken to "catch up" to native scroll position. Above ~1.5 it
      // stops reading as weight and starts reading as lag.
      smooth: 1.1,
      smoothTouch: 0,
      // Lets elements opt into parallax with data-speed / data-lag.
      effects: true,
      normalizeScroll: false,
    })

    return () => { smoother.kill() }
  }, [])

  return null
}
