export default function Loading() {
  return (
    <div className="animate-pulse w-full max-w-sm space-y-6">
      <div className="h-8 w-56 bg-border rounded" />
      <div className="h-4 w-full bg-surface rounded" />
      <div className="h-4 w-4/5 bg-surface rounded" />
      <div className="h-40 w-40 bg-border rounded mx-auto mt-4" />
      <div className="h-10 w-full bg-border rounded" />
      <div className="h-10 w-full bg-border rounded" />
    </div>
  )
}
