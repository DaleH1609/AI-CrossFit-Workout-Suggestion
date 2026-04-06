export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-44 bg-[#222] rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="h-48 bg-[#1a1a1a] rounded" />
            <div className="h-24 bg-[#1a1a1a] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
