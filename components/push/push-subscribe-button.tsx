'use client'
// components/push/push-subscribe-button.tsx
// Let members opt in/out of browser push notifications
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function PushSubscribeButton({ className }: { className?: string }) {
  const [state, setState] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setState(sub ? 'subscribed' : 'unsubscribed')
      })
    })
  }, [])

  async function subscribe() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) { alert('Push notifications not configured.'); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
      })

      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, userAgent: navigator.userAgent }),
      })
      setState('subscribed')
    } catch (err) {
      console.error('[push] subscribe error', err)
      if (Notification.permission === 'denied') setState('denied')
    } finally {
      setBusy(false)
    }
  }

  async function unsubscribe() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState('unsubscribed')
    } catch (err) {
      console.error('[push] unsubscribe error', err)
    } finally {
      setBusy(false)
    }
  }

  if (state === 'unsupported') return null
  if (state === 'loading') return null

  if (state === 'denied') {
    return (
      <p className={cn('text-xs text-secondary', className)}>
        Notifications blocked - enable in browser settings
      </p>
    )
  }

  return (
    <button
      onClick={state === 'subscribed' ? unsubscribe : subscribe}
      disabled={busy}
      className={cn(
        'text-sm px-3 py-1.5 rounded-md border border-border text-secondary hover:text-foreground hover:bg-surface-raised transition-colors disabled:opacity-50',
        className
      )}
    >
      {busy ? '…' : state === 'subscribed' ? '🔔 Notifications on' : '🔕 Enable notifications'}
    </button>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}
