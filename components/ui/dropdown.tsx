'use client'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DropdownProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; description?: string }[]
  placeholder?: string
  className?: string
}

export function Dropdown({ value, onChange, options, placeholder = 'Select…', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) } return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, options.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); const opt = options[focused]; if (opt) { onChange(opt.value); setOpen(false) } }
    if (e.key === 'Escape')    { setOpen(false) }
    if (e.key === 'Tab')       { setOpen(false) }
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => {
          if (!open) setFocused(0)
          setOpen(o => !o)
        }}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="dropdown-listbox"
        aria-activedescendant={open ? `dropdown-option-${options[focused]?.value}` : undefined}
      >
        <span className={selected ? 'text-foreground' : 'text-foreground-50'}>{selected?.label ?? placeholder}</span>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="2 4 6 8 10 4"/>
        </svg>
      </button>

      {open && (
        <ul
          id="dropdown-listbox"
          role="listbox"
          className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg
            opacity-100 translate-y-0 scale-100"
          style={{ transformOrigin: 'top' }}
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              id={`dropdown-option-${opt.value}`}
              role="option"
              aria-selected={opt.value === value}
              onMouseEnter={() => setFocused(i)}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                'flex items-start justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors text-sm',
                i === focused ? 'bg-surface-raised' : '',
                opt.value === value ? 'text-accent' : 'text-foreground'
              )}
            >
              <div>
                <div className="font-medium">{opt.label}</div>
                {opt.description && <div className="text-xs text-secondary mt-0.5">{opt.description}</div>}
              </div>
              {opt.value === value && (
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent mt-0.5 shrink-0">
                  <polyline points="2 7 6 11 12 3"/>
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
