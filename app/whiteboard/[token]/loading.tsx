export default function Loading() {
  return (
    <div className="animate-pulse min-h-screen bg-black p-8 flex flex-col gap-6">
      <div className="h-10 w-48 bg-zinc-800 rounded" />
      <div className="h-6 w-32 bg-zinc-700 rounded" />
      <div className="grid grid-cols-1 gap-6 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-zinc-800 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
