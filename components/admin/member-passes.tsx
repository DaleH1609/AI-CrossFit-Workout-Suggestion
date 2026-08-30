'use client'
import { useState, useEffect } from 'react'
import { Combobox } from '@/components/ui/combobox'

interface Pass {
  id: string
  pass_type: 'dropin' | 'trial'
  uses_total: number
  uses_used: number
  expires_at: string | null
  notes: string | null
  created_at: string
}

export function MemberPasses({ memberId }: { memberId: string }) {
  const [passes, setPasses] = useState<Pass[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ passType: 'dropin', usesTotal: '1', expiresAt: '', notes: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/passes?memberId=' + memberId)
    if (res.ok) setPasses(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [memberId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/passes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId,
        passType: form.passType,
        usesTotal: Number(form.usesTotal),
        expiresAt: form.expiresAt || null,
        notes: form.notes || null,
      }),
    })
    if (res.ok) { setForm({ passType: 'dropin', usesTotal: '1', expiresAt: '', notes: '' }); await load() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await fetch('/api/admin/passes?id=' + id, { method: 'DELETE' })
    setPasses(prev => prev.filter(p => p.id !== id))
  }

  const PASS_LABELS = { dropin: 'Drop-in', trial: 'Trial' }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-4 space-y-2">
        <div className="flex gap-2">
          <Combobox
            ariaLabel="Pass type"
            value={form.passType}
            onChange={v => v && setForm(f => ({ ...f, passType: v }))}
            className="flex-1 px-3 py-2 text-sm"
            options={[
              { value: 'dropin', label: 'Drop-in' },
              { value: 'trial', label: 'Trial Pass' },
            ]}
          />
          <input type="number" value={form.usesTotal} onChange={e => setForm(f => ({ ...f, usesTotal: e.target.value }))}
            min="1" max="100" placeholder="Uses"
            className="w-20 px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent" />
        </div>
        <div className="flex gap-2">
          <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
            placeholder="Expires (optional)"
            className="flex-1 px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent" />
          <button type="submit" disabled={saving}
            className="px-3 py-2 bg-accent text-on-accent text-xs font-bold rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50 whitespace-nowrap">
            {saving ? '…' : 'Issue Pass'}
          </button>
        </div>
      </form>

      {loading ? <p className="text-secondary text-sm">Loading…</p>
        : passes.length === 0 ? <p className="text-secondary-60 text-sm italic">No passes.</p>
        : (
          <div className="space-y-2">
            {passes.map(p => {
              const remaining = p.uses_total - p.uses_used
              const expired = p.expires_at && new Date(p.expires_at) < new Date()
              return (
                <div key={p.id} className="rounded-lg border border-border bg-surface p-3 flex items-start justify-between group">
                  <div>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded mr-2 ${
                      p.pass_type === 'trial' ? 'bg-warning/10 text-warning' : 'bg-accent-10 text-accent'
                    }`}>{PASS_LABELS[p.pass_type]}</span>
                    <span className={`text-xs ${remaining > 0 && !expired ? 'text-foreground' : 'text-secondary line-through'}`}>
                      {remaining}/{p.uses_total} uses remaining
                    </span>
                    {expired && <span className="ml-2 text-xs text-danger">Expired</span>}
                    {p.expires_at && !expired && (
                      <span className="ml-2 text-xs text-secondary">
                        Expires {new Date(p.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
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
