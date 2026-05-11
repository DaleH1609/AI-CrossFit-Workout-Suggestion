export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-border rounded mb-6" />
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface rounded-xl border border-border" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface rounded-xl border border-border" />
        ))}
      </div>
    </div>
  )
}
