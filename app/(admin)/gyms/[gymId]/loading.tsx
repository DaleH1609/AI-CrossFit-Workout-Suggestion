export default function GymDetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-border rounded mb-2" />
      <div className="h-4 w-32 bg-surface rounded mb-8" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface rounded-lg" />
        ))}
      </div>
    </div>
  )
}
