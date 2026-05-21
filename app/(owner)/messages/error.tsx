'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function MessagesError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[owner/messages] error boundary caught:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] -m-8 gap-4">
      <div className="text-center space-y-2">
        <h2 className="font-display text-xl text-foreground">Something went wrong</h2>
        <p className="text-secondary text-sm max-w-xs">
          There was a problem loading your messages. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-secondary font-mono">Error ID: {error.digest}</p>
        )}
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center px-4 py-2 rounded-btn text-sm font-medium bg-accent text-background hover:bg-accent/90 transition-all duration-200 active:scale-[0.97]"
      >
        Try again
      </button>
    </div>
  )
}
