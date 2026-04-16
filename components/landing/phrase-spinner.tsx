'use client'
import { useEffect, useRef } from 'react'

const PHRASES = [
  { num: '01', line1: 'Train ', accent1: 'Smarter.', line2: 'Coach Better.', accent2: '' },
  { num: '02', line1: 'Your Gym.', accent1: '', line2: '', accent2: 'Your Style.' },
  { num: '03', line1: 'Less Planning.', accent1: '', line2: '', accent2: 'More Coaching.' },
]

const NUM_PHRASES = PHRASES.length
const STEP = 360 / NUM_PHRASES          // 120°
const MAX_ROTATION = STEP * (NUM_PHRASES - 1)  // 240° — stops at last phrase

export function PhraseSpinner() {
  const outerRef    = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const pip0Ref     = useRef<HTMLDivElement>(null)
  const pip1Ref     = useRef<HTMLDivElement>(null)
  const pip2Ref     = useRef<HTMLDivElement>(null)
  const eyebrowRef  = useRef<HTMLParagraphElement>(null)
  const cueRef      = useRef<HTMLParagraphElement>(null)
  const rotRef      = useRef(0)  // current interpolated rotation
  const rafRef      = useRef<number>(0)

  useEffect(() => {
    const pipRefs = [pip0Ref, pip1Ref, pip2Ref]

    function tick() {
      const outer = outerRef.current
      const carousel = carouselRef.current
      if (!outer || !carousel) { rafRef.current = requestAnimationFrame(tick); return }

      const rect      = outer.getBoundingClientRect()
      const maxScroll = outer.offsetHeight - window.innerHeight
      const progress  = Math.max(0, Math.min(1, -rect.top / maxScroll))

      // Target rotation: multiply by 1.15 so full rotation is reached at ~87% progress
      const target = Math.min(progress * MAX_ROTATION * 1.15, MAX_ROTATION)
      rotRef.current += (target - rotRef.current) * 0.12

      carousel.style.transform = `rotateY(${-rotRef.current}deg)`

      // Active pip: nearest 120° step, clamped 0–2
      const active = Math.min(Math.round(rotRef.current / STEP), NUM_PHRASES - 1)
      pipRefs.forEach((ref, i) => {
        if (!ref.current) return
        ref.current.style.background = i === active ? 'var(--color-accent)' : 'var(--color-border)'
        ref.current.style.transform  = i === active ? 'scale(1.6)' : 'scale(1)'
      })

      // Eyebrow + cue visibility
      if (eyebrowRef.current) {
        eyebrowRef.current.style.color =
          progress > 0.01 && progress < 0.99
            ? 'var(--color-accent)'
            : 'color-mix(in srgb, var(--color-secondary) 30%, transparent)'
      }
      if (cueRef.current) {
        cueRef.current.style.opacity = progress > 0.06 ? '0' : '1'
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div
      ref={outerRef}
      className="relative h-[250vh] md:h-[400vh]"
      aria-hidden="true"
    >
      {/* Sticky container */}
      <div
        className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden bg-background border-t border-b border-border"
      >
        {/* Subtle gold radial wash */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, var(--color-accent-6, rgba(184,149,42,0.06)) 0%, transparent 70%)' }}
        />

        {/* Eyebrow */}
        <p
          ref={eyebrowRef}
          className="relative text-[10px] font-bold tracking-[0.25em] uppercase mb-11 transition-colors duration-700"
          style={{ color: 'color-mix(in srgb, var(--color-secondary) 30%, transparent)' }}
        >
          What KOVA is about
        </p>

        {/* 3D scene */}
        <div
          className="relative"
          style={{
            perspective: '900px',
            width: 'min(680px, 90vw)',
            height: 200,
          }}
        >
          <div
            ref={carouselRef}
            style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
          >
            {PHRASES.map((phrase, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: `rotateY(${i * STEP}deg) translateZ(280px)`,
                }}
              >
                <p className="text-[9px] font-bold tracking-[0.25em] text-accent mb-4 opacity-60">{phrase.num}</p>
                <p className="font-display text-[clamp(28px,4.5vw,52px)] font-bold leading-[1.15] text-center tracking-tight text-foreground">
                  {/* Line 1 */}
                  {phrase.line1}
                  {phrase.accent1 && <em className="not-italic text-accent">{phrase.accent1}</em>}
                  {/* Line 2 */}
                  {(phrase.line2 || phrase.accent2) && (
                    <><br />{phrase.line2}<em className="not-italic text-accent">{phrase.accent2}</em></>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Progress pips */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col gap-2.5">
          {[pip0Ref, pip1Ref, pip2Ref].map((ref, i) => (
            <div
              key={i}
              ref={ref}
              style={{
                width: 5, height: 5, borderRadius: '50%',
                background: i === 0 ? 'var(--color-accent)' : 'var(--color-border)',
                transform: i === 0 ? 'scale(1.6)' : 'scale(1)',
                transition: 'background 0.5s, transform 0.5s',
              }}
            />
          ))}
        </div>

        {/* Scroll cue */}
        <p
          ref={cueRef}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.18em] uppercase text-secondary/40 flex items-center gap-1.5 whitespace-nowrap pointer-events-none"
          style={{ transition: 'opacity 0.5s' }}
        >
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
            <path d="M5 1v8M5 9l-3-3M5 9l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Keep scrolling
        </p>
      </div>
    </div>
  )
}
