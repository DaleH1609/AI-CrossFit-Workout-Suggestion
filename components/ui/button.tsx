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
        'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && 'border border-accent text-foreground hover:bg-accent hover:text-background',
        variant === 'danger'  && 'border border-danger text-danger hover:bg-danger hover:text-foreground',
        variant === 'ghost'   && 'text-secondary hover:text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
Button.displayName = 'Button'
