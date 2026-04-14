import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-shimmer bg-foreground-10 rounded-card', className)} />
  )
}
