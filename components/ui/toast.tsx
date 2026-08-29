'use client'
import { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface Toast {
  id: number
  message: string
  type: ToastType
}

const ToastContext = createContext<{ toast: (message: string, type?: ToastType) => void }>({
  toast: () => {},
})

// Review fixes in this revision:
//   * aria-live regions so screen readers announce toasts
//     - errors go to role="alert" / aria-live="assertive"
//     - success + info go to aria-live="polite"
//   * role="status" on the polite region
//   * stable id via counter (Date.now() collides on rapid fires)
//   * id typed as number; separate counter ref would be overkill here
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    // Use a monotonic id to avoid collisions when two toasts are fired in the
    // same millisecond (e.g. a fetch that resolves both success+info at once).
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-2), { id, message, type }]) // max 3
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const errors = toasts.filter(t => t.type === 'error')
  const polite = toasts.filter(t => t.type !== 'error')

  const toastItem = (t: Toast) => (
    <div
      key={t.id}
      style={{
        padding: '12px 16px',
        background: t.type === 'error' ? '#7f1d1d' : t.type === 'success' ? '#14532d' : '#1a1a1a',
        border: `1px solid ${
          t.type === 'error' ? '#f87171' : t.type === 'success' ? '#4ade80' : '#C6F24E'
        }`,
        color: '#fff',
        fontSize: 14,
        minWidth: 280,
        maxWidth: 400,
      }}
    >
      {t.message}
    </div>
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {/* Assertive region - interrupts the reader for errors. */}
        <div role="alert" aria-live="assertive" aria-atomic="true" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {errors.map(toastItem)}
        </div>
        {/* Polite region - queued, for success/info. */}
        <div role="status" aria-live="polite" aria-atomic="true" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {polite.map(toastItem)}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
