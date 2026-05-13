export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-border rounded mb-8" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface rounded-lg" />
        ))}
      </div>
      <div className="h-48 bg-surface rounded-lg" />
    </div>
  )
}
