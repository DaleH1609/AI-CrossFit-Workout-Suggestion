export default function AdminGymsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-24 bg-border rounded mb-6" />
      <div className="h-10 bg-surface rounded mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface rounded" />
        ))}
      </div>
    </div>
  )
}
