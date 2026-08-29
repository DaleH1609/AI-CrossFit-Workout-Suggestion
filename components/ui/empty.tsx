import type React from 'react'
import { cn } from '@/lib/utils'

/**
 * Composable empty state, adapted from cnippet-empty on 21st.dev.
 *
 * Changes from the original:
 *
 * - No class-variance-authority. The original pulled cva in for a single
 *   two-value variant; a ternary does the same job without a dependency.
 * - Retheme to KOVA tokens. The original used shadcn names (bg-card,
 *   text-muted-foreground, bg-primary, --radius-md) that do not exist here.
 * - Dropped the `not-dark:bg-clip-padding` and `--theme(...)` syntax, which is
 *   Tailwind v4. This project is on v3.4 and would emit those as invalid.
 *
 * Use it for every empty screen so they share one shape. The audit calls a
 * bare "No data" line a missed opportunity, and inconsistent empty states are
 * what make an app feel unfinished in exactly the places people first land.
 */

export function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 text-balance px-6 py-12 text-center md:py-20',
        className,
      )}
      {...props}
    />
  )
}

export function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex max-w-sm flex-col items-center text-center', className)}
      {...props}
    />
  )
}

export function EmptyMedia({
  className,
  variant = 'default',
  children,
  ...props
}: React.ComponentProps<'div'> & { variant?: 'default' | 'icon' }) {
  const iconShell =
    'relative flex size-9 shrink-0 items-center justify-center rounded-btn border border-border ' +
    'bg-surface text-foreground shadow-ambient [&_svg:not([class*=size-])]:size-[18px]'

  return (
    <div data-slot="empty-media" data-variant={variant} className={cn('relative mb-6', className)}>
      {variant === 'icon' && (
        <>
          {/* Two ghosted copies fanned behind the real one, so a single icon
              reads as a stack of absent items rather than a lone glyph. */}
          <div
            aria-hidden="true"
            className={cn(
              iconShell,
              'pointer-events-none absolute bottom-px origin-bottom-left -translate-x-0.5 -rotate-[10deg] scale-[0.84] shadow-none',
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              iconShell,
              'pointer-events-none absolute bottom-px origin-bottom-right translate-x-0.5 rotate-[10deg] scale-[0.84] shadow-none',
            )}
          />
        </>
      )}
      <div
        className={cn(
          'flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
          variant === 'icon' && iconShell,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

export function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-title"
      className={cn('font-display uppercase tracking-tight text-2xl text-foreground', className)}
      {...props}
    />
  )
}

export function EmptyDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        'text-sm text-secondary [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-accent',
        '[[data-slot=empty-title]+&]:mt-2',
        className,
      )}
      {...props}
    />
  )
}

export function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        'flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance text-sm',
        className,
      )}
      {...props}
    />
  )
}
