export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-36 bg-border rounded mb-6" />
      <div className="h-20 bg-surface rounded mb-6" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 w-full bg-surface rounded" />
        ))}
      </div>
    </div>
  )
}
