'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import ConversationList, {
  type ConversationWithMember,
} from '@/components/messages/conversation-list'
import { MessageThread } from '@/components/messages/message-thread'
import { type Message } from '@/components/messages/message-bubble'

export default function OwnerMessagesPage() {
  const [conversations, setConversations] = useState<ConversationWithMember[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Keep a ref to selectedConversationId for use inside Realtime callbacks
  const selectedConvIdRef = useRef<string | null>(null)
  selectedConvIdRef.current = selectedConversationId

  // Fetch current user id on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id)
    })
  }, [])

  // Fetch conversations on mount
  useEffect(() => {
    async function loadConversations() {
      setLoading(true)
      try {
        const res = await fetch('/api/messages/conversations')
        if (!res.ok) {
          setFetchError('Failed to load conversations.')
          return
        }
        const data = (await res.json()) as { conversations: ConversationWithMember[] }
        setConversations(data.conversations)
      } finally {
        setLoading(false)
      }
    }
    loadConversations()
  }, [])

  // Derive gymId for the Realtime subscription
  const gymId = conversations[0]?.gym_id ?? null

  // Set up Supabase Realtime after conversations are loaded
  useEffect(() => {
    if (!gymId) return

    const supabase = createClient()
    const channel = supabase
      .channel('owner-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `gym_id=eq.${gymId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          const currentSelected = selectedConvIdRef.current

          // Append to messages if it belongs to the currently selected conversation
          if (newMsg.conversation_id === currentSelected) {
            setMessages((prev) => {
              // Avoid duplicates (e.g. optimistic update already added it)
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }

          // Update conversations list: last_message_at, preview, owner_unread
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== newMsg.conversation_id) return conv
              const isSelected = newMsg.conversation_id === currentSelected
              // TODO: skip own messages to avoid incrementing owner_unread for self-sent messages
              return {
                ...conv,
                last_message_at: newMsg.created_at,
                last_message_preview: newMsg.body,
                owner_unread: isSelected ? 0 : conv.owner_unread + 1,
              }
            })
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gymId])

  async function handleSelectConversation(conversationId: string) {
    selectedConvIdRef.current = conversationId
    setSelectedConversationId(conversationId)
    setMessages([])

    // Mark as read
    await fetch(`/api/messages/conversations/${conversationId}/read`, {
      method: 'PATCH',
    })

    // Update local state: reset owner_unread
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, owner_unread: 0 } : conv
      )
    )

    // Fetch messages for this conversation
    const res = await fetch(`/api/messages?conversationId=${conversationId}`)
    if (res.ok) {
      const data = (await res.json()) as { messages: Message[] }
      // Only update if user hasn't selected a different conversation since fetch started
      if (selectedConvIdRef.current !== conversationId) return
      setMessages(data.messages)
    }
  }

  async function handleSend(body: string) {
    if (!selectedConversationId || !body.trim()) return
    setSendingMessage(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, conversationId: selectedConversationId }),
      })
      if (res.ok) {
        const { message: newMsg } = (await res.json()) as { message: Message }
        // Append optimistically (Realtime dedup will handle duplicates)
        setMessages((prev) => [...prev, newMsg])
        // Update conversation preview + timestamp
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversationId
              ? {
                  ...conv,
                  last_message_at: newMsg.created_at,
                  last_message_preview: newMsg.body,
                }
              : conv
          )
        )
      }
    } finally {
      setSendingMessage(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] -m-8 overflow-hidden">
      {/* Left panel — conversation list */}
      <div
        className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-border bg-background flex flex-col ${
          selectedConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="px-4 py-3 border-b border-border">
          <h1 className="font-display text-xl text-foreground">Messages</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="flex items-center gap-2 text-secondary text-sm">
              <svg
                aria-hidden="true"
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Loading conversations…
            </div>
          </div>
        ) : fetchError ? (
          <p className="text-sm text-red-500 p-4">{fetchError}</p>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelect={handleSelectConversation}
            />
          </div>
        )}
      </div>

      {/* Right panel — message thread */}
      <div
        className={`flex-1 flex flex-col overflow-hidden bg-background ${
          selectedConversationId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedConversationId ? (
          <>
            {/* Mobile back button */}
            <div className="md:hidden px-4 py-2 border-b border-border">
              <button
                type="button"
                onClick={() => setSelectedConversationId(null)}
                className="text-sm text-accent font-medium"
              >
                &larr; Back to conversations
              </button>
            </div>

            {currentUserId ? (
              <MessageThread
                conversationId={selectedConversationId}
                currentUserId={currentUserId}
                initialMessages={messages}
                onSend={handleSend}
                disabled={sendingMessage}
              />
            ) : (
              <div className="flex items-center justify-center flex-1">
                <p className="text-secondary text-sm">Loading…</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <p className="text-secondary text-sm">
              Select a conversation to start messaging.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
