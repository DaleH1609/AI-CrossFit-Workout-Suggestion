import { cn } from '@/lib/utils'

type BadgeVariant = 'draft' | 'published' | 'confirmed' | 'waitlisted' | 'pending_confirmation'

const variants: Record<BadgeVariant, string> = {
  draft:                'bg-foreground-10 text-secondary',
  published:            'bg-accent-20 text-accent',
  confirmed:            'bg-success-20 text-success',
  waitlisted:           'bg-foreground-10 text-secondary',
  pending_confirmation: 'bg-warning-20 text-warning',
}

export function Badge({ variant, label }: { variant: BadgeVariant; label: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant])}>
      {label}
    </span>
  )
}
