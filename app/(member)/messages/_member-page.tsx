'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageThread } from '@/components/messages/message-thread'
import { type Message } from '@/components/messages/message-bubble'

export default function MemberMessagesPage() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [memberUnread, setMemberUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Keep a stable ref for use inside Realtime callbacks
  const conversationIdRef = useRef<string | null>(null)
  conversationIdRef.current = conversationId

  // On mount: discover conversation via unread endpoint, then load messages
  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) setCurrentUserId(user.id)

        const unreadRes = await fetch('/api/messages/unread')
        if (!unreadRes.ok) return

        const unreadData = (await unreadRes.json()) as {
          unread: number
          conversation_id: string | null
        }

        setMemberUnread(unreadData.unread)

        const convId = unreadData.conversation_id
        if (!convId) {
          // No conversation yet — show empty state
          return
        }

        setConversationId(convId)
        conversationIdRef.current = convId

        // Load messages
        const msgRes = await fetch(`/api/messages?conversationId=${convId}`)
        if (!msgRes.ok) {
          setLoadError('Failed to load messages.')
          return
        }
        const msgData = (await msgRes.json()) as { messages: Message[] }
        setMessages(msgData.messages)

        // Mark as read
        if (unreadData.unread > 0) {
          await fetch(`/api/messages/conversations/${convId}/read`, {
            method: 'PATCH',
          })
          setMemberUnread(0)
        }
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  // Set up Realtime subscription once we know the conversationId
  useEffect(() => {
    if (!conversationId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`member-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          // Avoid duplicates with optimistic updates
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          // If the message is from the owner (not self), it's unread until we mark it
          // Mark as read immediately since the member is looking at the conversation
          if (newMsg.sender_id !== currentUserId) {
            fetch(`/api/messages/conversations/${conversationId}/read`, {
              method: 'PATCH',
            }).catch(() => {
              // Non-fatal: silently ignore
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId])

  async function handleSend(body: string) {
    if (!body.trim()) return
    setSendingMessage(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) throw new Error('Failed to send')

      const data = (await res.json()) as { message: Message }
      const newMsg = data.message

      // Append optimistically (Realtime dedup will handle any duplicate)
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })

      // If this was the first message, set the conversationId
      if (!conversationId) {
        setConversationId(newMsg.conversation_id)
        conversationIdRef.current = newMsg.conversation_id
      }
    } finally {
      setSendingMessage(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-160px)]">
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
          Loading messages…
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] -mx-8 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <h1 className="font-display text-xl text-foreground">Messages</h1>
        {memberUnread > 0 && (
          <p className="text-xs text-accent mt-0.5">
            {memberUnread} unread message{memberUnread !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Load error */}
      {loadError && (
        <p className="text-sm text-red-500 text-center p-4">{loadError}</p>
      )}

      {/* Thread or empty state */}
      <div className="flex-1 overflow-hidden">
        {currentUserId ? (
          <MessageThread
            conversationId={conversationId ?? ''}
            currentUserId={currentUserId}
            initialMessages={messages}
            onSend={handleSend}
            disabled={sendingMessage || loading}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-secondary text-sm">Loading…</p>
          </div>
        )}
      </div>
    </div>
  )
}
