'use client'

import { useMemo, useState } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Command } from 'cmdk'
import { CaretUpDown, Check, MagnifyingGlass } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

/**
 * Styled single-select, replacing native <select>.
 *
 * The reason to move off <select> here is not search — most of these lists are
 * four or five entries long. It is that a native select paints OS chrome: on a
 * dark surface it opens a light system menu and ignores every token in the
 * design system. It is the one control on the page that always looks like it
 * came from somewhere else.
 *
 * Search appears only once a list is long enough to need it (see
 * SEARCH_THRESHOLD). Showing a search box above five options is the kind of
 * detail that reads as unconsidered.
 *
 * Built on Radix Popover for dismiss/collision/focus-return, and cmdk for the
 * filtering and roving focus — the same pairing behind the command palette, so
 * this adds no new concepts to the codebase.
 *
 * Deliberately not handled here: multi-select, async loading, and free-text
 * entry. Nothing in the app needs them yet, and each one changes the keyboard
 * model enough that guessing now would be wrong later.
 */

const SEARCH_THRESHOLD = 8

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string | null
  onChange: (value: string | null) => void
  /** Shown when nothing is selected. Also the label of the clear row when clearable. */
  placeholder?: string
  /** Adds a row that resets the value to null — the "- unassigned -" case. */
  clearable?: boolean
  disabled?: boolean
  className?: string
  /** Accessible name. Required when no visible <label> is wired to this control. */
  ariaLabel?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  clearable = false,
  disabled = false,
  className,
  ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => options.find(o => o.value === value), [options, value])
  const showSearch = options.length >= SEARCH_THRESHOLD

  const select = (next: string | null) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            'inline-flex w-full items-center justify-between gap-2 rounded-btn border border-border bg-surface px-2 py-1 text-left text-xs text-foreground',
            'transition-colors focus:outline-none focus:border-accent focus-visible:ring-1 focus-visible:ring-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
        >
          <span className={cn('truncate', !selected && 'text-secondary')}>
            {selected?.label ?? placeholder}
          </span>
          <CaretUpDown size={12} className="shrink-0 text-secondary" aria-hidden="true" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          // Match the trigger width so the menu reads as part of the control
          // rather than a floating panel — but cap it. Some of these triggers
          // are flex-1 inside a wide row, and a 950px menu listing two short
          // names looks broken. A native select never did that: its popup
          // sized to content.
          className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-[10rem] max-w-xs max-h-[min(50vh,18rem)] overflow-hidden rounded-card border border-border bg-surface p-1 shadow-lift"
        >
          <Command
            // cmdk's own filter is fine; we only need it when search is shown.
            shouldFilter={showSearch}
            className="flex flex-col overflow-hidden"
          >
            {showSearch && (
              <div className="flex items-center gap-2 border-b border-border px-2 pb-1.5 mb-1">
                <MagnifyingGlass size={12} className="shrink-0 text-secondary" aria-hidden="true" />
                <Command.Input
                  autoFocus
                  placeholder="Search…"
                  className="h-7 w-full bg-transparent text-xs text-foreground placeholder:text-secondary focus:outline-none"
                />
              </div>
            )}

            <Command.List className="overflow-y-auto">
              {showSearch && (
                <Command.Empty className="px-2 py-4 text-center text-xs text-secondary">
                  Nothing matches that.
                </Command.Empty>
              )}

              {clearable && (
                <Command.Item
                  value={placeholder}
                  onSelect={() => select(null)}
                  className="flex cursor-pointer items-center gap-2 rounded-btn px-2 py-1.5 text-xs text-secondary data-[selected=true]:bg-accent-10 data-[selected=true]:text-accent"
                >
                  <span className="w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{placeholder}</span>
                </Command.Item>
              )}

              {options.map(o => (
                <Command.Item
                  key={o.value}
                  value={o.label}
                  onSelect={() => select(o.value)}
                  className="flex cursor-pointer items-center gap-2 rounded-btn px-2 py-1.5 text-xs text-foreground data-[selected=true]:bg-accent-10 data-[selected=true]:text-accent"
                >
                  <span className="w-3 shrink-0">
                    {o.value === value && <Check size={12} weight="bold" aria-hidden="true" />}
                  </span>
                  <span className="truncate">{o.label}</span>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
