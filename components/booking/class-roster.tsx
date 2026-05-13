'use client'
import { useState } from 'react'

interface RosterData {
  showNames: boolean
  count: number
  names?: string[]
}

export function ClassRoster({ instanceId }: { instanceId: string }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<RosterData | null>(null)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (open) { setOpen(false); return }
    if (!data) {
      setLoading(true)
      try {
        const res = await fetch(`/api/schedule/roster?instanceId=${instanceId}`)
        if (res.ok) setData(await res.json())
      } finally {
        setLoading(false)
      }
    }
    setOpen(true)
  }

  const label = loading
    ? 'Loading…'
    : open && data
      ? 'Hide'
      : 'Who\'s coming?'

  return (
    <div className="mt-2">
      <button
        onClick={toggle}
        className="text-xs text-secondary hover:text-foreground transition-colors underline-offset-2 hover:underline"
      >
        {label}
      </button>

      {open && data && (
        <div className="mt-1.5 text-xs text-secondary">
          {data.count === 0 ? (
            <span>Just you so far.</span>
          ) : data.showNames && data.names ? (
            <span>{data.names.join(', ')}{data.count > data.names.length ? ` +${data.count - data.names.length} more` : ''}</span>
          ) : (
            <span>{data.count} other{data.count !== 1 ? 's' : ''} confirmed</span>
          )}
        </div>
      )}
    </div>
  )
}
