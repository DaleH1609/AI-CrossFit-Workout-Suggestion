import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {label && (
          <label htmlFor={id} className="text-xs tracking-widest text-secondary uppercase font-semibold">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full bg-surface border border-border text-foreground px-3 py-2 text-sm rounded-btn focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'
