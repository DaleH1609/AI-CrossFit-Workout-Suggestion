'use client'

export interface ConversationWithMember {
  id: string
  gym_id: string
  member_id: string
  created_at: string
  last_message_at: string
  owner_unread: number
  member_unread: number
  member_name: string
  member_email: string
  last_message_preview: string | null
}

interface ConversationListProps {
  conversations: ConversationWithMember[]
  selectedConversationId: string | null
  onSelect: (conversationId: string) => void
}

function formatLastMessageAt(isoString: string): string {
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isToday) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function ConversationList({
  conversations,
  selectedConversationId,
  onSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full px-4 py-8">
        <p className="text-secondary text-sm">No conversations yet.</p>
      </div>
    )
  }

  return (
    <ul className="overflow-y-auto h-full divide-y divide-border">
      {conversations.map((conv) => {
        const isSelected = conv.id === selectedConversationId
        const hasUnread = conv.owner_unread > 0

        return (
          <li key={conv.id}>
            <button
              type="button"
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left px-4 py-3 cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent ${
                isSelected
                  ? 'bg-accent-10 border-l-2 border-l-accent'
                  : 'hover:bg-surface-raised'
              }`}
            >
              {/* Row 1: name + unread dot + timestamp */}
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {hasUnread && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-accent" aria-label="Unread messages" />
                  )}
                  <span className={`text-sm truncate ${hasUnread ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                    {conv.member_name || 'Unknown Member'}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-secondary tabular-nums">
                  {formatLastMessageAt(conv.last_message_at)}
                </span>
              </div>

              {/* Row 2: member email */}
              <p className="text-xs text-secondary truncate mb-0.5 pl-3.5">
                {conv.member_email}
              </p>

              {/* Row 3: last message preview */}
              <p className="text-xs text-secondary truncate pl-3.5">
                {conv.last_message_preview ?? 'No messages yet'}
              </p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
