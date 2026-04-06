import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {label && <label htmlFor={id} style={{ fontSize: 12, letterSpacing: 1, color: '#9CA3AF', textTransform: 'uppercase' }}>{label}</label>}
        <input
          ref={ref}
          id={id}
          className={`w-full bg-[#1a1a1a] border border-[#333] text-white px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] ${className}`}
          {...props}
        />
        {error && <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'
