import { cn } from '@/lib/utils'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn(
      'bg-surface backdrop-blur-md border border-accent-border rounded-card p-4',
      className
    )}>
      {children}
    </div>
  )
}
