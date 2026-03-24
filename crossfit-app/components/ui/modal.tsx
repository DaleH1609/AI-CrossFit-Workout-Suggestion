'use client'
import { useEffect } from 'react'
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

export function Modal({ open, title, description, confirmLabel = 'Confirm', confirmVariant = 'primary', onConfirm, onCancel }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc" className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative bg-surface border border-accent-border rounded-card p-6 max-w-md w-full mx-4">
        <h2 id="modal-title" className="font-display text-xl text-white mb-2">{title}</h2>
        <p id="modal-desc" className="text-secondary text-sm mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
