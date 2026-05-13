export default function Loading() {
  return (
    <div className="animate-pulse flex flex-col gap-4 w-full max-w-sm">
      <div className="h-8 w-40 bg-border rounded" />
      <div className="h-4 w-52 bg-surface rounded" />
      <div className="h-10 w-full bg-surface rounded mt-2" />
      <div className="h-10 w-full bg-surface rounded" />
      <div className="h-10 w-full bg-border rounded mt-1" />
    </div>
  )
}
