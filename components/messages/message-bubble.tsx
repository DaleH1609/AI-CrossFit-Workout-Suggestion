'use client'

export interface Message {
  id: string
  conversation_id: string
  gym_id: string
  sender_id: string
  body: string
  created_at: string
}

interface MessageBubbleProps {
  message: {
    id: string
    sender_id: string
    body: string
    created_at: string
  }
  currentUserId: string
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (isToday) return timeStr

  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return `${dateStr}, ${timeStr}`
}

export function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
  const isSelf = message.sender_id === currentUserId

  return (
    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[75%] px-3 py-2 rounded-card text-sm leading-relaxed ${
          isSelf
            ? 'bg-accent text-on-accent'
            : 'bg-surface-raised text-foreground border border-border'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p
          className={`text-[11px] mt-1 ${
            isSelf ? 'text-background/70 text-right' : 'text-secondary text-left'
          }`}
        >
          {formatTimestamp(message.created_at)}
        </p>
      </div>
    </div>
  )
}
