'use client'
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <p style={{ color: '#f87171' }}>Something went wrong.</p>
      <button onClick={reset} style={{ color: '#D4AF37', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
        Try again
      </button>
    </div>
  )
}
