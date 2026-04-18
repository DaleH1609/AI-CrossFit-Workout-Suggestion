export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-36 bg-border rounded mb-6" />
      <div className="space-y-6 max-w-md">
        <div className="bg-surface rounded p-4 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-border rounded" />
              <div className="h-10 w-full bg-border rounded" />
            </div>
          ))}
          <div className="h-9 w-28 bg-border rounded" />
        </div>
        <div className="bg-surface rounded p-4 space-y-3">
          <div className="h-4 w-24 bg-border rounded" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 w-full bg-border rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
