import { Skeleton } from '@/components/ui/skeleton'

export default function MemberMessagesLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-160px)] -mx-8 overflow-hidden">
      {/* Header skeleton */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <Skeleton className="h-7 w-28" />
      </div>

      {/* Message bubbles skeleton */}
      <div className="flex-1 overflow-hidden px-4 py-4 space-y-3">
        {/* Incoming messages (left-aligned) */}
        <div className="flex justify-start">
          <Skeleton className="h-12 w-56 rounded-card" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-8 w-40 rounded-card" />
        </div>
        {/* Outgoing messages (right-aligned) */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-48 rounded-card" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-14 w-64 rounded-card" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-10 w-52 rounded-card" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-8 w-36 rounded-card" />
        </div>
      </div>

      {/* Input skeleton */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <Skeleton className="h-10 w-full rounded-btn" />
      </div>
    </div>
  )
}
