'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

/**
 * Calendar, adapted from the origin-ui component on 21st.dev.
 *
 * Three changes from the original:
 *
 * 1. Retheme. The original targets shadcn token names (bg-primary,
 *    text-muted-foreground, ring, popover, input) which do not exist in this
 *    project, so verbatim it would render almost entirely unstyled. Mapped to
 *    KOVA tokens.
 * 2. Icons. Original used lucide ChevronLeft/Right; DESIGN.md locks the icon
 *    family to Phosphor.
 * 3. It imported buttonVariants from a cva-based shadcn Button we do not have.
 *    The nav buttons are styled directly instead, which also avoids pulling
 *    class-variance-authority in for two buttons.
 *
 * Verified against react-day-picker v10: all thirteen classNames keys used
 * here are still present in v10's UI enum.
 */

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components: userComponents,
  ...props
}: CalendarProps) {
  const navButton =
    'inline-flex size-9 items-center justify-center rounded-btn p-0 text-secondary ' +
    'transition-colors duration-200 ease-expo hover:bg-surface-raised hover:text-foreground ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

  const defaultClassNames = {
    months: 'relative flex flex-col sm:flex-row gap-4',
    month: 'w-full',
    month_caption: 'relative mx-10 mb-1 flex h-9 items-center justify-center z-20',
    // Month/year label reads as a technical label, matching the rest of the app.
    caption_label: 'font-mono text-[11px] uppercase tracking-[0.18em] text-foreground',
    nav: 'absolute top-0 flex w-full justify-between z-10',
    button_previous: navButton,
    button_next: navButton,
    weekday: 'size-9 p-0 font-mono text-[10px] uppercase tracking-[0.1em] text-secondary',
    day_button: cn(
      'relative flex size-9 items-center justify-center whitespace-nowrap rounded-btn p-0',
      'text-sm text-foreground tabular-nums',
      'transition-[color,background-color] duration-200 ease-expo',
      'hover:bg-surface-raised',
      'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
      // Selected: accent fill with background-coloured text. Works in both
      // themes because the accent token flips per theme.
      'group-data-[selected]:bg-accent group-data-[selected]:text-background',
      // Disabled days are struck through rather than merely dimmed, so a fully
      // booked class reads as unavailable and not as a rendering fault.
      'group-data-[disabled]:pointer-events-none group-data-[disabled]:text-foreground-50',
      'group-data-[disabled]:line-through',
      'group-data-[outside]:text-foreground-50',
      'group-[.range-start:not(.range-end)]:rounded-e-none',
      'group-[.range-end:not(.range-start)]:rounded-s-none',
      'group-[.range-middle]:rounded-none',
      'group-data-[selected]:group-[.range-middle]:bg-accent-20',
      'group-data-[selected]:group-[.range-middle]:text-foreground',
    ),
    day: 'group size-9 px-0 text-sm',
    range_start: 'range-start',
    range_end: 'range-end',
    range_middle: 'range-middle',
    // Today marked with a dot beneath rather than a fill, so it never competes
    // with the selected state.
    today:
      '*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 ' +
      '*:after:z-10 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full ' +
      '*:after:bg-accent [&[data-selected]:not(.range-middle)>*]:after:bg-background ' +
      '*:after:transition-colors',
    outside: 'text-secondary data-selected:bg-surface-raised data-selected:text-secondary',
    hidden: 'invisible',
    week_number: 'size-9 p-0 font-mono text-[10px] text-secondary',
  }

  const mergedClassNames = Object.keys(defaultClassNames).reduce(
    (acc, key) => ({
      ...acc,
      [key]: classNames?.[key as keyof typeof classNames]
        ? cn(
            defaultClassNames[key as keyof typeof defaultClassNames],
            classNames[key as keyof typeof classNames],
          )
        : defaultClassNames[key as keyof typeof defaultClassNames],
    }),
    {} as typeof defaultClassNames,
  )

  const defaultComponents = {
    Chevron: ({ orientation }: { orientation?: 'left' | 'right' | 'up' | 'down' }) =>
      orientation === 'left' ? (
        <CaretLeft size={16} aria-hidden="true" />
      ) : (
        <CaretRight size={16} aria-hidden="true" />
      ),
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('w-fit', className)}
      classNames={mergedClassNames}
      components={{ ...defaultComponents, ...userComponents }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
