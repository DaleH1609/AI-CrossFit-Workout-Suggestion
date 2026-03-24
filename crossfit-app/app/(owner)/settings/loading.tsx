export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-36 bg-[#222] rounded mb-6" />
      <div className="space-y-6 max-w-md">
        <div className="bg-[#1a1a1a] rounded p-4 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-[#222] rounded" />
              <div className="h-10 w-full bg-[#222] rounded" />
            </div>
          ))}
          <div className="h-9 w-28 bg-[#222] rounded" />
        </div>
        <div className="bg-[#1a1a1a] rounded p-4 space-y-3">
          <div className="h-4 w-24 bg-[#222] rounded" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 w-full bg-[#222] rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
