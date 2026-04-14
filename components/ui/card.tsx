import { cn } from '@/lib/utils'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-surface border border-border rounded-card p-4', className)}>
      {children}
    </div>
  )
}
