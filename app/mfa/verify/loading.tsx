export default function Loading() {
  return (
    <div className="animate-pulse w-full max-w-sm space-y-6">
      <div className="h-8 w-48 bg-border rounded" />
      <div className="h-4 w-full bg-surface rounded" />
      <div className="h-10 w-full bg-border rounded mt-4" />
      <div className="h-10 w-full bg-border rounded" />
    </div>
  )
}
