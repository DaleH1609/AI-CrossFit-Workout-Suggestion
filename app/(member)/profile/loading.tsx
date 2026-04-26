export default function Loading() {
  return (
    <div className="animate-pulse max-w-md">
      <div className="h-8 w-32 bg-border rounded mb-8" />
      <div className="space-y-6">
        <div className="h-10 w-full bg-surface rounded" />
        <div className="h-10 w-full bg-surface rounded" />
        <div className="h-9 w-24 bg-border rounded" />
      </div>
    </div>
  )
}
