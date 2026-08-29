'use client'
import { ButtonHTMLAttributes, forwardRef, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'solid' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Pill geometry, per the Nike reference. Opt-in so in-app chrome is unaffected. */
  shape?: 'default' | 'pill'
  /**
   * Cursor-following magnetic pull. Deliberately opt-in: it belongs on a marketing
   * CTA, not on the submit button of a booking form where it would fight the tap.
   */
  magnetic?: boolean
}

// `md` reproduces the previous button box exactly — this component is used in
// 150+ places including the dense schedule grid, and a taller default would
// silently reflow all of them. The reference's 48px control is `lg`, opted into
// on marketing surfaces.
const SIZES = {
  sm: 'h-8 px-3 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'h-12 px-8 text-sm',
  xl: 'h-14 px-10 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', shape = 'default', magnetic = false, children, ...props }, ref) => {
    const innerRef = useRef<HTMLButtonElement | null>(null)

    useEffect(() => {
      const el = innerRef.current
      if (!el || !magnetic) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      // Coarse pointers have no hover to follow — magnetism would only add lag.
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

      // quickTo keeps a single interpolator alive rather than spawning a tween
      // per mousemove event.
      const moveX = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' })
      const moveY = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' })

      const onMove = (e: MouseEvent) => {
        const r = el.getBoundingClientRect()
        // Pull toward the cursor at 28% of the offset from centre — enough to
        // feel alive, not enough to detach the label from the hit area.
        moveX((e.clientX - (r.left + r.width / 2)) * 0.28)
        moveY((e.clientY - (r.top + r.height / 2)) * 0.28)
      }
      const onLeave = () => { moveX(0); moveY(0) }

      el.addEventListener('mousemove', onMove)
      el.addEventListener('mouseleave', onLeave)
      return () => {
        el.removeEventListener('mousemove', onMove)
        el.removeEventListener('mouseleave', onLeave)
        gsap.killTweensOf(el)
      }
    }, [magnetic])

    return (
      <button
        ref={(node) => {
          innerRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 overflow-hidden touch-manipulation',
          'font-medium tracking-tight will-change-transform',
          // Springy press — snappier in than out, so it reads as physical.
          'transition-[background-color,color,border-color,transform] duration-200 ease-out active:scale-[0.97]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:pointer-events-none',
          SIZES[size],
          shape === 'pill' ? 'rounded-full' : 'rounded-btn',
          variant === 'primary' && 'border border-accent text-foreground hover:bg-accent hover:text-background',
          variant === 'solid'   && 'bg-accent text-background hover:bg-accent-90',
          variant === 'danger'  && 'border border-danger text-danger hover:bg-danger hover:text-foreground',
          variant === 'ghost'   && 'text-secondary hover:text-foreground',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
