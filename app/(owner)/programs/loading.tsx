export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-36 bg-surface border border-border rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-surface border border-border rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-surface border border-border rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-surface border border-border rounded-card animate-pulse" />
        ))}
      </div>
    </div>
  )
}
