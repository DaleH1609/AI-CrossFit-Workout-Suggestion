import { Skeleton } from '@/components/ui/skeleton'

export default function MessagesLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] -m-8 overflow-hidden">
      {/* Left panel skeleton */}
      <div className="w-80 lg:w-96 flex-shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="flex-1 divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
          ))}
        </div>
      </div>

      {/* Right panel skeleton */}
      <div className="flex-1 flex items-center justify-center">
        <p className="text-secondary text-sm">Select a conversation to start messaging.</p>
      </div>
    </div>
  )
}
