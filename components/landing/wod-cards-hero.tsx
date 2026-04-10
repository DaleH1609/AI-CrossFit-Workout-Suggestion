'use client'
import { useEffect, useState } from 'react'

export function WodCardsHero() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative h-[380px] flex items-center justify-center select-none" aria-hidden="true">
      {/* Secondary card — behind, slightly offset */}
      <div
        className={`absolute w-72 bg-surface border border-border shadow rounded-xl p-4 transition-opacity duration-500
          ${visible ? 'opacity-60 animate-float-b' : 'opacity-0'}`}
        style={{ transform: 'rotate(2deg)', top: '14%', left: '12%', transitionDelay: '150ms' }}
      >
        <p className="text-xs font-semibold tracking-widest text-secondary uppercase mb-1">Tuesday — Metcon</p>
        <p className="text-sm text-foreground font-medium">For Time: 21-15-9</p>
        <p className="text-xs text-secondary mt-1">Thrusters / Pull-ups</p>
      </div>

      {/* Primary card — foreground */}
      <div
        className={`relative w-72 bg-surface border border-border shadow-lg rounded-xl p-5 transition-opacity duration-500
          ${visible ? 'opacity-100 animate-float-a' : 'opacity-0'}`}
        style={{ transform: 'rotate(-2deg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold tracking-widest text-accent uppercase">Monday — Strength</span>
          <span className="w-2 h-2 rounded-full bg-accent block" />
        </div>

        {/* Main movement */}
        <p className="text-base font-bold text-foreground mb-0.5">Back Squat 5×5</p>
        <p className="text-xs text-secondary mb-3">@ 80% 1RM — 3 min rest</p>

        <div className="border-t border-border mb-3" />

        {/* Metcon */}
        <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-2">AMRAP 15 MIN</p>
        <ul className="space-y-1">
          {['10 Pull-ups', '15 Box Jumps (24/20")', '20 KB Swings (24/16 kg)'].map(m => (
            <li key={m} className="text-sm text-secondary">· {m}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
