'use client'
import { useEffect, useRef } from 'react'
import { Button } from './button'

interface ModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
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
  onConfirm,
  onCancel,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

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
    cancelRef.current?.focus()

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
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="relative bg-surface border border-border rounded-card p-6 max-w-md w-full mx-4"
      >
        <h2 id="modal-title" className="font-display text-xl text-foreground mb-2">
          {title}
        </h2>
        <p id="modal-desc" className="text-secondary text-sm mb-6">
          {description}
        </p>
        <div className="flex gap-3 justify-end">
          <Button ref={cancelRef} variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
