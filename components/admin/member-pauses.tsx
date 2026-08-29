'use client'
import { useState, useEffect } from 'react'

interface Pause {
  id: string
  pause_from: string
  pause_to: string
  reason: string | null
  created_at: string
}

export function MemberPauses({ memberId }: { memberId: string }) {
  const [pauses, setPauses] = useState<Pause[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ pauseFrom: '', pauseTo: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/admin/pauses?memberId=' + memberId)
    if (res.ok) setPauses(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [memberId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/admin/pauses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, pauseFrom: form.pauseFrom, pauseTo: form.pauseTo, reason: form.reason || null }),
    })
    if (res.ok) {
      setForm({ pauseFrom: '', pauseTo: '', reason: '' })
      await load()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed to save pause')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await fetch('/api/admin/pauses?id=' + id, { method: 'DELETE' })
    setPauses(prev => prev.filter(p => p.id !== id))
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-secondary mb-1 block">From</label>
            <input type="date" value={form.pauseFrom} min={today}
              onChange={e => setForm(f => ({ ...f, pauseFrom: e.target.value }))} required
              className="w-full px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-secondary mb-1 block">To</label>
            <input type="date" value={form.pauseTo} min={form.pauseFrom || today}
              onChange={e => setForm(f => ({ ...f, pauseTo: e.target.value }))} required
              className="w-full px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent" />
          </div>
        </div>
        <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
          placeholder="Reason (optional)"
          className="w-full px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent" />
        {error && <p className="text-danger text-xs">{error}</p>}
        <button type="submit" disabled={saving}
          className="px-3 py-2 bg-accent text-on-accent text-xs font-bold rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Add Pause'}
        </button>
      </form>

      {loading ? <p className="text-secondary text-sm">Loading…</p>
        : pauses.length === 0 ? <p className="text-secondary-60 text-sm italic">No pauses recorded.</p>
        : (
          <div className="space-y-2">
            {pauses.map(p => {
              const isActive = p.pause_from <= today && p.pause_to >= today
              return (
                <div key={p.id} className="rounded-lg border border-border bg-surface p-3 flex items-start justify-between group">
                  <div>
                    {isActive && <span className="text-xs bg-warning/10 text-warning px-1.5 py-0.5 rounded mr-2">Active</span>}
                    <span className="text-xs text-foreground">
                      {new Date(p.pause_from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {' → '}
                      {new Date(p.pause_to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {p.reason && <p className="text-xs text-secondary mt-0.5">{p.reason}</p>}
                  </div>
                  <button onClick={() => handleDelete(p.id)}
                    className="text-danger text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:underline ml-2">
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
