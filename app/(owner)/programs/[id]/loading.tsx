export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-surface border border-border rounded animate-pulse" />
          <div className="h-8 w-48 bg-surface border border-border rounded animate-pulse" />
          <div className="h-4 w-32 bg-surface border border-border rounded animate-pulse" />
        </div>
        <div className="h-9 w-24 bg-surface border border-border rounded animate-pulse" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="h-28 bg-surface border border-border rounded-card animate-pulse" />
        ))}
      </div>
    </div>
  )
}
