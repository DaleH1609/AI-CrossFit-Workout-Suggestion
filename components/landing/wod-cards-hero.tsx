'use client'
import { useEffect, useState } from 'react'

export function WodCardsHero() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="relative h-[420px] flex items-center justify-center select-none"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/*
        Pure-CSS hover fan trick:
        - `.wod-card` base transition  = EXIT easing (hover-off): snappy overshoot
        - `.card-stack:hover .wod-card` transition = ENTER easing (hover-on): spring out
        No JS mouse events needed.
      */}
      <style>{`
        .wod-card {
          transition:
            transform  0.42s cubic-bezier(0.36, 0, 0.66, -0.25),
            opacity    0.35s ease,
            box-shadow 0.35s ease;
        }
        .card-stack:hover .wod-card {
          transition:
            transform  0.52s cubic-bezier(0.34, 1.5, 0.64, 1),
            opacity    0.35s ease,
            box-shadow 0.4s ease;
        }

        /* c1 — front card: stays in place on hover */
        .card-stack:hover .c1 {
          animation: none;
          transform: rotate(-1.5deg);
          box-shadow: 0 8px 28px rgba(0,0,0,0.09), 0 0 0 1.5px rgba(184,149,42,0.18);
        }

        /* c2 — mid card: fans right */
        .card-stack:hover .c2 {
          animation: none;
          transform: translateX(148px) rotate(9deg) translateY(-14px);
          opacity: 1;
          box-shadow: 0 12px 36px rgba(0,0,0,0.09), 0 0 0 1.5px rgba(184,149,42,0.13);
          transition-delay: 0.04s;
        }

        /* c3 — back card: fans left */
        .card-stack:hover .c3 {
          animation: none;
          transform: translateX(-148px) rotate(-10deg) translateY(-10px);
          opacity: 1;
          box-shadow: 0 12px 36px rgba(0,0,0,0.09), 0 0 0 1.5px rgba(184,149,42,0.13);
          transition-delay: 0.08s;
        }

        .card-stack:hover .stack-hint { opacity: 0; }
      `}</style>

      <div className="card-stack relative" style={{ width: 288, height: 230, overflow: 'visible', cursor: 'pointer' }}>

        {/* c3 — Wednesday Skills (back, fans left) */}
        <div
          className={`wod-card c3 absolute w-[272px] bg-surface border border-border rounded-xl p-4
            transition-opacity duration-500
            ${visible ? 'animate-float-c' : 'opacity-0'}`}
          style={{ top: 18, left: 8, transform: 'rotate(-4deg)', opacity: visible ? 0.38 : 0, zIndex: 1 }}
        >
          <p className="text-xs font-semibold tracking-widest text-secondary uppercase mb-1">Wednesday — Skills</p>
          <p className="text-sm text-foreground font-medium">Gymnastics EMOM</p>
          <p className="text-xs text-secondary mt-1">20 min — 4 movements</p>
          <div className="border-t border-border my-3" />
          <ul className="space-y-1">
            {['Strict HSPU', 'L-Sit Hold 30s', 'Ring Muscle-ups'].map(m => (
              <li key={m} className="text-xs text-secondary">· {m}</li>
            ))}
          </ul>
        </div>

        {/* c2 — Tuesday Metcon (mid, fans right) */}
        <div
          className={`wod-card c2 absolute w-[272px] bg-surface border border-border rounded-xl p-4
            transition-opacity duration-500
            ${visible ? 'animate-float-b' : 'opacity-0'}`}
          style={{ top: 10, left: 8, transform: 'rotate(3deg)', opacity: visible ? 0.65 : 0, zIndex: 2, transitionDelay: '100ms' }}
        >
          <p className="text-xs font-semibold tracking-widest text-secondary uppercase mb-1">Tuesday — Metcon</p>
          <p className="text-sm text-foreground font-medium">For Time: 21-15-9</p>
          <p className="text-xs text-secondary mt-1">Thrusters / Pull-ups</p>
          <div className="border-t border-border my-3" />
          <ul className="space-y-1">
            {['Thrusters (42.5 / 30 kg)', 'Pull-ups'].map(m => (
              <li key={m} className="text-xs text-secondary">· {m}</li>
            ))}
          </ul>
        </div>

        {/* c1 — Monday Strength (front, stays put) */}
        <div
          className={`wod-card c1 absolute w-[272px] bg-surface border border-border shadow-lg rounded-xl p-5
            transition-opacity duration-500
            ${visible ? 'animate-float-a' : 'opacity-0'}`}
          style={{ top: 0, left: 8, transform: 'rotate(-1.5deg)', zIndex: 3, transitionDelay: '150ms' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold tracking-widest text-accent uppercase">Monday — Strength</span>
            <span className="w-2 h-2 rounded-full bg-accent block" />
          </div>
          <p className="text-base font-bold text-foreground mb-0.5">Back Squat 5×5</p>
          <p className="text-xs text-secondary mb-3">@ 80% 1RM — 3 min rest</p>
          <div className="border-t border-border mb-3" />
          <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-2">AMRAP 15 MIN</p>
          <ul className="space-y-1">
            {['10 Pull-ups', '15 Box Jumps (24/20")', '20 KB Swings (24/16 kg)'].map(m => (
              <li key={m} className="text-sm text-secondary">· {m}</li>
            ))}
          </ul>
        </div>

        {/* Hover hint */}
        <p
          className="stack-hint absolute text-[9px] tracking-widest uppercase text-secondary/40 whitespace-nowrap pointer-events-none"
          style={{ bottom: -22, left: '50%', transform: 'translateX(-50%)', transition: 'opacity 0.3s' }}
        >
          Hover to reveal
        </p>
      </div>
    </div>
  )
}
