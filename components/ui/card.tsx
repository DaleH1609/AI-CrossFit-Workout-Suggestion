import { cn } from '@/lib/utils'

/**
 * Surface card.
 *
 * Was `bg-surface border border-border rounded-card p-4` — the exact
 * "border + shadow + background" combination the design audit calls the most
 * generic card pattern there is.
 *
 * Now a double-bezel: an inset outer shell holding an inner core, with
 * concentric radii (inner = outer minus the 6px shell padding) so the corners
 * nest correctly. Depth comes from a bright inset hairline along the top edge
 * rather than a drop shadow — on a near-black ground a black shadow is
 * invisible, whereas a highlight catching the top edge is how a raised surface
 * actually reads.
 */
export function Card({
  className,
  innerClassName,
  interactive = false,
  children,
}: {
  className?: string
  innerClassName?: string
  /** Adds hover lift. Only for cards that are themselves clickable. */
  interactive?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-card-lg p-1.5 ring-1 ring-border bg-surface-raised/40',
        'transition-[transform,box-shadow] duration-400 ease-fluid',
        interactive && 'hover:-translate-y-0.5 hover:shadow-lift',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-card bg-surface p-4 shadow-ambient shadow-inset-hi',
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
