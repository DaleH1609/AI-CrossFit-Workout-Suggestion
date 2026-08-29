'use client'
import { useEffect, useRef, useState } from 'react'

const PHRASES = [
  { line1: 'Train ', accent1: 'Smarter.', line2: 'Coach Better.', accent2: '' },
  { line1: 'Your Gym.', accent1: '', line2: '', accent2: 'Your Style.' },
  { line1: 'Less Planning.', accent1: '', line2: '', accent2: 'More Coaching.' },
]

const NUM_PHRASES = PHRASES.length
const STEP = 360 / NUM_PHRASES  // 120°

export function PhraseSpinner() {
  const [active, setActive] = useState(0)
  const sent1 = useRef<HTMLDivElement>(null)
  const sent2 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Sentinel 1: crossing into phrase 2
    const obs1 = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setActive(1)
      else if (e.boundingClientRect.top > 0) setActive(0)  // exited from bottom = scrolled back up
    }, { threshold: 0 })

    // Sentinel 2: crossing into phrase 3
    const obs2 = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setActive(2)
      else if (e.boundingClientRect.top > 0) setActive(1)  // exited from bottom = scrolled back up
    }, { threshold: 0 })

    if (sent1.current) obs1.observe(sent1.current)
    if (sent2.current) obs2.observe(sent2.current)
    return () => { obs1.disconnect(); obs2.disconnect() }
  }, [])

  const rotation = active * STEP

  return (
    <div className="relative" style={{ height: '350vh' }} aria-hidden="true">
      {/* Sentinel divs - absolute siblings of the sticky div, not inside it */}
      <div ref={sent1} style={{ position: 'absolute', top: '30%', height: '1px', width: '100%', pointerEvents: 'none' }} />
      <div ref={sent2} style={{ position: 'absolute', top: '60%', height: '1px', width: '100%', pointerEvents: 'none' }} />

      {/* Sticky container - no overflow-hidden so preserve-3d works in Safari */}
      <div className="sticky top-0 min-h-[100dvh] flex flex-col items-center justify-center bg-background border-t border-b border-border">

        {/* Subtle gold radial wash */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, var(--color-accent-6, rgba(85,115,15,0.06)) 0%, transparent 70%)' }}
        />

        {/* Eyebrow */}
        <p
          className="relative text-[10px] font-bold tracking-[0.25em] uppercase mb-11"
          style={{
            color: active > 0
              ? 'var(--color-accent)'
              : 'color-mix(in srgb, var(--color-secondary) 30%, transparent)',
            transition: 'color 0.7s',
          }}
        >
          What KOVA is about
        </p>

        {/* 3D scene */}
        <div
          className="relative"
          style={{ perspective: '900px', width: 'min(680px, 90vw)', height: 200 }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              transformStyle: 'preserve-3d',
              position: 'relative',
              transform: `rotateY(${-rotation}deg)`,
              transition: 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
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
                <p className="font-display text-[clamp(28px,4.5vw,52px)] font-bold leading-[1.15] text-center tracking-tight text-foreground">
                  {phrase.line1}
                  {phrase.accent1 && <em className="not-italic text-accent">{phrase.accent1}</em>}
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
          {PHRASES.map((_, i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: i === active ? 'var(--color-accent)' : 'var(--color-border)',
                transform: i === active ? 'scale(1.6)' : 'scale(1)',
                transition: 'background 0.5s, transform 0.5s',
              }}
            />
          ))}
        </div>

        {/* Scroll cue */}
        <p
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.18em] uppercase text-secondary/40 flex items-center gap-1.5 whitespace-nowrap pointer-events-none"
          style={{ opacity: active === 0 ? 1 : 0, transition: 'opacity 0.5s' }}
        >
          <svg aria-hidden="true" width="10" height="12" viewBox="0 0 10 12" fill="none">
            <path d="M5 1v8M5 9l-3-3M5 9l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Keep scrolling
        </p>
      </div>
    </div>
  )
}
