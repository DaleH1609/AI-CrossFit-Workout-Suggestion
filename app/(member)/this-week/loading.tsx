export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-44 bg-border rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="h-48 bg-surface rounded" />
            <div className="h-24 bg-surface rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
