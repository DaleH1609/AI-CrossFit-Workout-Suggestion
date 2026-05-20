'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSend: (body: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

const MAX_CHARS = 2000
const CHAR_WARNING_THRESHOLD = 1800

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message…',
}: MessageInputProps) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isDisabled = disabled || sending
  const charCount = body.length
  const showCharCount = charCount > CHAR_WARNING_THRESHOLD
  const atLimit = charCount >= MAX_CHARS

  const handleSend = useCallback(async () => {
    const trimmed = body.trim()
    if (!trimmed || disabled || sending) return

    setSending(true)
    try {
      await onSend(trimmed)
      setBody('')
      textareaRef.current?.focus()
    } catch {
      setError('Failed to send. Try again.')
    } finally {
      setSending(false)
    }
  }, [body, disabled, sending, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="flex flex-col gap-1.5 border-t border-border bg-background pt-3 px-4 pb-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value.slice(0, MAX_CHARS))
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            aria-label={placeholder ?? 'Message'}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={2}
            className={cn(
              'w-full resize-none bg-surface border border-border text-foreground',
              'px-3 py-2 text-sm rounded-btn leading-relaxed',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'placeholder:text-secondary'
            )}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={isDisabled || !body.trim()}
          aria-label="Send message"
          className={cn(
            'flex-shrink-0 flex items-center justify-center',
            'px-3 py-2 rounded-btn text-sm font-medium transition-all duration-200',
            'border border-accent text-foreground hover:bg-accent hover:text-background',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-background',
            'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
          )}
        >
          {sending ? (
            <svg
              aria-hidden="true"
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[11px] text-secondary">
          {sending ? 'Sending…' : 'Ctrl/Cmd+Enter to send'}
        </p>
        {showCharCount && (
          <p className={cn('text-[11px]', atLimit ? 'text-danger' : 'text-secondary')}>
            {charCount}/{MAX_CHARS}
          </p>
        )}
      </div>
    </div>
  )
}
