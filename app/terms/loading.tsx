export default function Loading() {
  return (
    <div className="animate-pulse max-w-2xl mx-auto px-4 py-12 flex flex-col gap-4">
      <div className="h-8 w-56 bg-border rounded" />
      <div className="h-4 w-32 bg-surface rounded" />
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 bg-surface rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
        ))}
      </div>
      <div className="h-6 w-44 bg-border rounded mt-6" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 bg-surface rounded" style={{ width: `${60 + (i % 4) * 9}%` }} />
        ))}
      </div>
    </div>
  )
}
