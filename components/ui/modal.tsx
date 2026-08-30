'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from './button'

interface ModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  /**
   * When set, the confirm button stays disabled until the user types this
   * exact string. For irreversible actions a single click is too cheap a
   * gesture: the phrase forces the user to read what they are destroying and
   * makes an accidental confirm essentially impossible.
   *
   * Reserve it for genuinely permanent operations. On a reversible action it
   * is friction with no safety return, and it trains people to type through
   * the prompt without reading it.
   */
  confirmPhrase?: string
  onConfirm: () => void
  onCancel: () => void
}

// Review fixes in this revision:
//   * focus trap inside the modal (Tab/Shift+Tab cycle through focusable children)
//   * auto-focus the cancel button on open for keyboard users
//   * restore focus to the element that opened the modal on close
//   * still closes on Escape / backdrop click (unchanged)
export function Modal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  confirmPhrase,
  onConfirm,
  onCancel,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const phraseRef = useRef<HTMLInputElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const phraseId = useId()
  const titleId = useId()
  const descId = useId()

  const [typed, setTyped] = useState('')
  const confirmBlocked = !!confirmPhrase && typed !== confirmPhrase

  // Clear the typed phrase whenever the dialog opens or closes, so reopening
  // never inherits a still-valid phrase from the previous target.
  useEffect(() => {
    setTyped('')
  }, [open, confirmPhrase])

  // Lock body scroll while open.
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Escape closes; Tab is trapped within the modal.
  useEffect(() => {
    if (!open) return

    // Remember what was focused so we can restore on close.
    previouslyFocused.current = (document.activeElement as HTMLElement | null) ?? null

    // Auto-focus the cancel button (safest default; user can Tab to confirm).
    // When a phrase is required the phrase itself is the guard, so focus the
    // input instead and save the user a Tab.
    if (confirmPhrase) phraseRef.current?.focus()
    else cancelRef.current?.focus()

    const getFocusable = (): HTMLElement[] => {
      if (!dialogRef.current) return []
      const nodes = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      return Array.from(nodes).filter(el => !el.hasAttribute('aria-hidden'))
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }
      if (e.key !== 'Tab') return

      const focusable = getFocusable()
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last || !dialogRef.current?.contains(active)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      // Restore focus to the element that opened us.
      previouslyFocused.current?.focus?.()
    }
  }, [open, onCancel, confirmPhrase])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="relative bg-surface border border-border rounded-card p-6 max-w-md w-full mx-4"
      >
        <h2 id={titleId} className="font-display text-xl text-foreground mb-2">
          {title}
        </h2>
        <p id={descId} className="text-secondary text-sm mb-6">
          {description}
        </p>
        {confirmPhrase && (
          <div className="mb-6 flex flex-col gap-2">
            <label htmlFor={phraseId} className="text-secondary text-sm">
              Type{' '}
              <span className="font-mono text-foreground bg-surface-raised border border-border rounded px-1.5 py-0.5 text-xs">
                {confirmPhrase}
              </span>{' '}
              to confirm.
            </label>
            <input
              ref={phraseRef}
              id={phraseId}
              type="text"
              value={typed}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => {
                // Enter is the natural submit once the phrase matches, but it
                // must not fire while the guard is still unsatisfied.
                if (e.key === 'Enter' && !confirmBlocked) {
                  e.preventDefault()
                  onConfirm()
                }
              }}
              className="w-full bg-surface border border-border text-foreground px-3 py-2 text-sm rounded-btn focus:outline-none focus:border-danger focus:ring-1 focus:ring-danger transition-colors"
            />
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <Button ref={cancelRef} variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={confirmBlocked}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
