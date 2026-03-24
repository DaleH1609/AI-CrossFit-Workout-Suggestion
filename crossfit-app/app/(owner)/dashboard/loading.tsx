export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-48 bg-[#222] rounded mb-2" />
          <div className="h-4 w-32 bg-[#1a1a1a] rounded" />
        </div>
        <div className="h-9 w-36 bg-[#222] rounded" />
      </div>
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-64 bg-[#1a1a1a] rounded" />
        ))}
      </div>
    </div>
  )
}
