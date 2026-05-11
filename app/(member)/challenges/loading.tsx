export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-36 bg-border rounded mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-surface rounded-xl border border-border" />
        ))}
      </div>
    </div>
  )
}
