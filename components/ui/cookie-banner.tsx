'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'kova_cookie_notice_dismissed'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true)
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — don't show
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-between gap-4 px-6 py-4 bg-surface border-t border-border text-sm text-secondary"
    >
      <p className="max-w-prose">
        We use essential cookies only - to keep you signed in and protect form submissions. No tracking or advertising cookies.{' '}
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy policy
        </Link>
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 px-4 py-2 rounded-md bg-surface-raised text-foreground text-xs font-medium hover:opacity-80 transition-opacity"
      >
        Got it
      </button>
    </div>
  )
}
