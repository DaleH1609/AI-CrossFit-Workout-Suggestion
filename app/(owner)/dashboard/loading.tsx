export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-48 bg-border rounded mb-2" />
          <div className="h-4 w-32 bg-surface rounded" />
        </div>
        <div className="h-9 w-36 bg-border rounded" />
      </div>
      <div className="grid grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-64 bg-surface rounded" />
        ))}
      </div>
    </div>
  )
}
