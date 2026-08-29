import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Double-bezel container ("Doppelrand").
 *
 * A card sitting flat on the background reads as a div with a border. Nesting
 * an inner core inside a slightly-inset outer shell reads as a physical
 * object — a glass plate in a machined tray. The two radii are concentric:
 * the inner radius is the outer minus the shell padding, which is what stops
 * the corners looking wrong.
 *
 * Depth comes from a bright inset hairline on the top edge rather than a dark
 * drop shadow. On a dark ground a black shadow is invisible; a highlight
 * catching the top edge is how a raised surface actually looks.
 */
export function Panel({
  children,
  className,
  innerClassName,
  as: Tag = 'div',
  lift = false,
}: {
  children: ReactNode
  className?: string
  innerClassName?: string
  as?: 'div' | 'section' | 'article'
  /** Raise on hover — only for panels that are themselves interactive. */
  lift?: boolean
}) {
  return (
    <Tag
      className={cn(
        'rounded-card-lg p-1.5 bg-foreground-10/[0.03] ring-1 ring-border',
        'transition-[transform,box-shadow] duration-400 ease-fluid',
        lift && 'hover:-translate-y-0.5 hover:shadow-lift',
        className
      )}
    >
      {/* rounded-card == rounded-card-lg (20px) minus the 6px shell padding */}
      <div
        className={cn(
          'h-full rounded-card bg-surface shadow-ambient shadow-inset-hi',
          innerClassName
        )}
      >
        {children}
      </div>
    </Tag>
  )
}
