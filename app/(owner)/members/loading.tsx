export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-36 bg-[#222] rounded mb-6" />
      <div className="h-20 bg-[#1a1a1a] rounded mb-6" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 w-full bg-[#1a1a1a] rounded" />
        ))}
      </div>
    </div>
  )
}
