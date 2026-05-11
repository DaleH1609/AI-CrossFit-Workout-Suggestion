export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-24 bg-border rounded" />
        <div className="h-9 w-28 bg-border rounded" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface rounded-xl border border-border" />
        ))}
      </div>
    </div>
  )
}
