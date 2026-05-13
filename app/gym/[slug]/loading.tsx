export default function GymProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto py-12 animate-pulse">
      <div className="h-10 w-64 bg-border rounded mb-3" />
      <div className="h-5 w-48 bg-surface rounded mb-8" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-surface rounded-lg" />
        ))}
      </div>
    </div>
  )
}
