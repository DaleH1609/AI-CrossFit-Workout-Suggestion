import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'px-4 py-2 rounded-btn text-sm font-medium transition-all duration-200',
        variant === 'primary' && 'border border-accent text-white hover:bg-accent hover:text-black',
        variant === 'danger' && 'border border-danger text-danger hover:bg-danger hover:text-white',
        variant === 'ghost' && 'text-secondary hover:text-white',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
Button.displayName = 'Button'
