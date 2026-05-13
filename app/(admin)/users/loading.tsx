export default function AdminUsersLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-32 bg-border rounded mb-6" />
      <div className="h-10 bg-surface rounded mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface rounded" />
        ))}
      </div>
    </div>
  )
}
