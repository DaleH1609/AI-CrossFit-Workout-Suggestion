'use client'

import type { MotionValue } from 'motion/react'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Scroll-velocity marquee, from cnippet on 21st.dev (MIT).
 *
 * Taken essentially as written, which is unusual for these. The engineering is
 * careful in ways that matter: it pauses via IntersectionObserver when
 * off-screen and via visibilitychange on a hidden tab, re-measures with
 * ResizeObserver rather than assuming a fixed width, animates only `x` on a
 * transform-gpu layer, and disconnects every observer on unmount.
 *
 * The context lets several rows share one velocity source, so a stack of
 * marquees does not each run their own scroll listener.
 */

export const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min
}

const ScrollVelocityContext = React.createContext<MotionValue<number> | null>(null)

export function ScrollVelocityContainer({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 })
  const velocityFactor = useTransform(smoothVelocity, (v) => {
    const sign = v < 0 ? -1 : 1
    return sign * Math.min(5, (Math.abs(v) / 1000) * 5)
  })

  return (
    <ScrollVelocityContext.Provider value={velocityFactor}>
      <div className={cn('relative w-full', className)} {...props}>
        {children}
      </div>
    </ScrollVelocityContext.Provider>
  )
}

interface ScrollVelocityRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  baseVelocity?: number
  direction?: 1 | -1
  scrollReactivity?: boolean
}

interface ScrollVelocityRowImplProps extends ScrollVelocityRowProps {
  velocityFactor: MotionValue<number>
}

function ScrollVelocityRowImpl({
  children,
  baseVelocity = 5,
  direction = 1,
  className,
  velocityFactor,
  scrollReactivity = true,
  ...props
}: ScrollVelocityRowImplProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)
  const [numCopies, setNumCopies] = useState(1)

  const baseX = useMotionValue(0)
  const baseDirectionRef = useRef<number>(direction >= 0 ? 1 : -1)
  const currentDirectionRef = useRef<number>(direction >= 0 ? 1 : -1)
  const unitWidth = useMotionValue(0)

  const isInViewRef = useRef(true)
  const isPageVisibleRef = useRef(true)
  const prefersReducedMotionRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    const block = blockRef.current
    let ro: ResizeObserver | null = null
    let io: IntersectionObserver | null = null
    let mq: MediaQueryList | null = null

    const handleVisibility = () => {
      isPageVisibleRef.current = document.visibilityState === 'visible'
    }
    const handlePRM = () => {
      if (mq) prefersReducedMotionRef.current = mq.matches
    }

    if (container && block) {
      const updateSizes = () => {
        const cw = container.offsetWidth || 0
        const bw = block.scrollWidth || 0
        unitWidth.set(bw)
        const nextCopies = bw > 0 ? Math.max(3, Math.ceil(cw / bw) + 2) : 1
        setNumCopies((prev) => (prev === nextCopies ? prev : nextCopies))
      }

      updateSizes()

      ro = new ResizeObserver(updateSizes)
      ro.observe(container)
      ro.observe(block)

      io = new IntersectionObserver(([entry]) => {
        if (entry) isInViewRef.current = entry.isIntersecting
      })
      io.observe(container)

      document.addEventListener('visibilitychange', handleVisibility, { passive: true })
      handleVisibility()

      mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      mq.addEventListener('change', handlePRM)
      handlePRM()
    }

    return () => {
      if (ro) ro.disconnect()
      if (io) io.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      if (mq) mq.removeEventListener('change', handlePRM)
    }
  }, [unitWidth])

  const x = useTransform([baseX, unitWidth], ([v, bw]) => {
    const width = Number(bw) || 1
    const offset = Number(v) || 0
    return `${-wrap(0, width, offset)}px`
  })

  useAnimationFrame((_, delta) => {
    if (!isInViewRef.current || !isPageVisibleRef.current) return
    // Reduced motion holds the base speed rather than stopping outright; the
    // strip still reads as a strip, it just does not react to scrolling.
    if (prefersReducedMotionRef.current && scrollReactivity) return

    const dt = delta / 1000
    const vf = scrollReactivity ? velocityFactor.get() : 0
    const absVf = Math.min(5, Math.abs(vf))
    const speedMultiplier = prefersReducedMotionRef.current ? 1 : 1 + absVf

    if (absVf > 0.1) {
      const scrollDirection = vf >= 0 ? 1 : -1
      currentDirectionRef.current = baseDirectionRef.current * scrollDirection
    }

    const bw = unitWidth.get() || 0
    if (bw <= 0) return
    const pixelsPerSecond = (bw * baseVelocity) / 100
    const moveBy = currentDirectionRef.current * pixelsPerSecond * speedMultiplier * dt
    baseX.set(baseX.get() + moveBy)
  })

  return (
    <div
      className={cn('w-full overflow-hidden whitespace-nowrap', className)}
      ref={containerRef}
      {...props}
    >
      <motion.div
        className="inline-flex transform-gpu select-none items-center will-change-transform"
        style={{ x }}
      >
        {Array.from({ length: numCopies }).map((_, i) => (
          <div
            aria-hidden={i !== 0}
            className="inline-flex shrink-0 items-center"
            key={i}
            ref={i === 0 ? blockRef : null}
          >
            {children}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

function ScrollVelocityRowLocal(props: ScrollVelocityRowProps) {
  const { scrollY } = useScroll()
  const localVelocity = useVelocity(scrollY)
  const localSmoothVelocity = useSpring(localVelocity, { damping: 50, stiffness: 400 })
  const localVelocityFactor = useTransform(localSmoothVelocity, (v) => {
    const sign = v < 0 ? -1 : 1
    return sign * Math.min(5, (Math.abs(v) / 1000) * 5)
  })
  return <ScrollVelocityRowImpl {...props} velocityFactor={localVelocityFactor} />
}

export function ScrollVelocityRow(props: ScrollVelocityRowProps) {
  const shared = useContext(ScrollVelocityContext)
  if (shared) return <ScrollVelocityRowImpl {...props} velocityFactor={shared} />
  return <ScrollVelocityRowLocal {...props} />
}

export default ScrollVelocityRow
