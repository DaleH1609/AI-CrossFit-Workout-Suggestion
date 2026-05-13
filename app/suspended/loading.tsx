export default function Loading() {
  return (
    <div className="animate-pulse flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 bg-border rounded-full" />
        <div className="h-6 w-48 bg-border rounded" />
        <div className="h-4 w-64 bg-surface rounded" />
      </div>
    </div>
  )
}
