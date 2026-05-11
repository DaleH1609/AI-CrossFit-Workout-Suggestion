export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-border rounded mb-6" />
      <div className="h-10 bg-surface rounded mb-4" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface rounded border border-border" />
        ))}
      </div>
    </div>
  )
}
