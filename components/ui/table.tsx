'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Table primitives, rebuilt from cnippet-table on 21st.dev.
 *
 * The original could not be used as written: it is entirely Tailwind v4
 * syntax, and this project is on 3.4.19. Specifically it relies on the v4
 * `in-*` and `not-in-*` parent-data variants, plus `--theme()`, `--spacing()`
 * and `var(--radius-xl)`. In v3 none of those compile, so the card variant
 * would have rendered as an unstyled HTML table.
 *
 * Rebuilt with the variant carried in React context instead of CSS parent
 * selectors. That is not merely a workaround: it replaces roughly 1,200
 * characters of generated selector soup per element with a readable ternary,
 * and it means the variant is type-checked.
 *
 * Colour comes from KOVA tokens rather than the original's hardcoded
 * emerald/amber/blue.
 */

type TableVariant = 'default' | 'card'

const VariantContext = React.createContext<TableVariant>('default')
const useVariant = () => React.useContext(VariantContext)

export function Table({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'table'> & { variant?: TableVariant }) {
  return (
    <VariantContext.Provider value={variant}>
      {/* Horizontal overflow is contained here so a wide table never makes the
          page itself scroll sideways. */}
      <div className="relative w-full overflow-x-auto">
        <table
          className={cn(
            'w-full caption-bottom text-sm',
            variant === 'card' && 'border-separate border-spacing-0',
            className,
          )}
          {...props}
        />
      </div>
    </VariantContext.Provider>
  )
}

export function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />
}

export function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  const variant = useVariant()
  return (
    <tbody
      className={cn(
        '[&_tr:last-child]:border-0',
        variant === 'card' && [
          '[&_tr]:border-0',
          '[&_tr>td]:border-b [&_tr>td]:border-border [&_tr>td]:bg-surface',
          '[&_tr>td:first-child]:border-l [&_tr>td:last-child]:border-r',
          '[&_tr:first-child>td]:border-t',
          // Concentric corners on the outer cells so the body reads as one card.
          '[&_tr:first-child>td:first-child]:rounded-tl-card',
          '[&_tr:first-child>td:last-child]:rounded-tr-card',
          '[&_tr:last-child>td:first-child]:rounded-bl-card',
          '[&_tr:last-child>td:last-child]:rounded-br-card',
          '[&_tr:hover>td]:bg-surface-raised',
          '[&_tr[data-state=selected]>td]:bg-accent-10',
        ],
        className,
      )}
      {...props}
    />
  )
}

export function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  const variant = useVariant()
  return (
    <tfoot
      className={cn(
        'font-medium [&>tr]:last:border-b-0',
        variant === 'card' ? 'border-none' : 'border-t border-border bg-surface-raised/60',
        className,
      )}
      {...props}
    />
  )
}

export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  const variant = useVariant()
  return (
    <tr
      className={cn(
        'relative border-b border-border transition-colors duration-200 ease-expo',
        variant === 'default' && 'hover:bg-surface-raised data-[state=selected]:bg-accent-10',
        className,
      )}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        // Column headers as mono technical labels, matching the nav and
        // section eyebrows elsewhere in the app.
        'h-10 whitespace-nowrap px-2.5 text-left align-middle font-mono text-[10px] uppercase tracking-[0.12em] text-secondary',
        'has-[[role=checkbox]]:w-px',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'whitespace-nowrap bg-clip-padding p-2.5 align-middle text-foreground',
        'has-[[role=checkbox]]:w-px',
        className,
      )}
      {...props}
    />
  )
}

export function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return <caption className={cn('mt-4 text-sm text-secondary', className)} {...props} />
}

/**
 * Status pill for table cells. The original demo hardcoded emerald/amber/blue;
 * these map onto the semantic tokens that already exist and are AA-checked.
 */
export function TableBadge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'
  children: React.ReactNode
  className?: string
}) {
  const tones = {
    neutral: 'border-border text-secondary',
    success: 'border-success/25 bg-success-10 text-success',
    warning: 'border-warning/25 bg-warning-10 text-warning',
    danger: 'border-danger/25 bg-danger-10 text-danger',
    accent: 'border-accent/25 bg-accent-10 text-accent',
  } as const

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5',
        'font-mono text-[10px] uppercase tracking-[0.1em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
