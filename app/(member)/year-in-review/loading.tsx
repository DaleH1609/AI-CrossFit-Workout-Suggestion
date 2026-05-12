export default function YearInReviewLoading() {
  return (
    <div className="max-w-lg mx-auto space-y-4 animate-pulse">
      <div className="h-8 bg-surface rounded w-48" />
      <div className="h-4 bg-surface rounded w-32" />
      <div className="grid grid-cols-2 gap-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface rounded-lg" />
        ))}
      </div>
      <div className="h-48 bg-surface rounded-lg" />
    </div>
  )
}
