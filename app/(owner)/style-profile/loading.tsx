export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-44 bg-border rounded mb-6" />
      <div className="space-y-4">
        <div className="h-32 bg-surface rounded" />
        <div className="h-32 bg-surface rounded" />
        <div className="h-32 bg-surface rounded" />
      </div>
    </div>
  )
}
