export default function Loading() {
  return (
    <div className="animate-pulse flex flex-col items-center justify-center min-h-64">
      <div className="h-32 w-32 bg-surface rounded-full border border-border mb-6" />
      <div className="h-6 w-40 bg-border rounded mb-2" />
      <div className="h-4 w-32 bg-surface rounded" />
    </div>
  )
}
