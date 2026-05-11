export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-40 bg-border rounded" />
        <div className="h-9 w-36 bg-border rounded" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-surface rounded-xl border border-border" />
        ))}
      </div>
    </div>
  )
}
