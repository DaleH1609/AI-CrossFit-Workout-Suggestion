export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-border rounded mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 w-full bg-surface rounded" />
        ))}
      </div>
    </div>
  )
}
