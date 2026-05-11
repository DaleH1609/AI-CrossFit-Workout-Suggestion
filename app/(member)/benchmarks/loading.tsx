export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-border rounded mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-surface rounded-xl border border-border" />
        ))}
      </div>
    </div>
  )
}
