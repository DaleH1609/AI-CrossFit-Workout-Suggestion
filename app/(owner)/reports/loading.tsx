export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-32 bg-border rounded mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface rounded-xl border border-border" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="h-40 bg-surface rounded-xl border border-border" />
        <div className="h-40 bg-surface rounded-xl border border-border" />
      </div>
      <div className="h-48 bg-surface rounded-xl border border-border mb-8" />
      <div className="h-64 bg-surface rounded-xl border border-border" />
    </div>
  )
}
