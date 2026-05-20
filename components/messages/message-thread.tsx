'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble, type Message } from './message-bubble'
import { MessageInput } from './message-input'

interface MessageThreadProps {
  conversationId: string
  currentUserId: string
  initialMessages: Message[]
  onSend: (body: string) => Promise<void>
  disabled?: boolean
}

export function MessageThread({
  // conversationId is exposed as a prop for the parent page to pass through;
  // Realtime subscriptions are set up at the page level, not within this component.
  conversationId: _conversationId,
  currentUserId,
  initialMessages,
  onSend,
  disabled,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  // Scroll to bottom on mount (instant) and whenever messages change (smooth)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: isFirstRender.current ? 'instant' : 'smooth',
    })
    isFirstRender.current = false
  }, [initialMessages])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollable message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" aria-live="polite">
        {initialMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-secondary text-sm">
              No messages yet. Send the first one!
            </p>
          </div>
        ) : (
          initialMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              currentUserId={currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Pinned input at bottom */}
      <MessageInput onSend={onSend} disabled={disabled} />
    </div>
  )
}
