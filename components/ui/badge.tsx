import { cn } from '@/lib/utils'

type BadgeVariant = 'draft' | 'published' | 'confirmed' | 'waitlisted' | 'pending_confirmation'

const variants: Record<BadgeVariant, string> = {
  draft: 'bg-white/10 text-secondary',
  published: 'bg-accent/20 text-accent',
  confirmed: 'bg-green-500/20 text-green-400',
  waitlisted: 'bg-white/10 text-secondary',
  pending_confirmation: 'bg-yellow-500/20 text-yellow-400',
}

export function Badge({ variant, label }: { variant: BadgeVariant; label: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant])}>
      {label}
    </span>
  )
}
