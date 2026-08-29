'use client'
// components/member/measurements.tsx
// Body composition / measurement tracker with mini trend chart
import { useState, useEffect } from 'react'

interface Measurement {
  id: string
  measured_at: string
  weight_kg: number | null
  body_fat_pct: number | null
  muscle_mass_kg: number | null
  chest_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  notes: string | null
}

function MiniTrend({ values }: { values: (number | null)[] }) {
  const nums = values.filter((v): v is number => v !== null)
  if (nums.length < 2) return null
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const range = max - min || 1
  const w = 80, h = 24
  const pts = nums.map((v, i) => `${(i / (nums.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const FIELDS: { key: keyof Omit<Measurement, 'id' | 'measured_at' | 'notes'>; label: string; unit: string }[] = [
  { key: 'weight_kg',      label: 'Weight',       unit: 'kg' },
  { key: 'body_fat_pct',   label: 'Body fat',     unit: '%' },
  { key: 'muscle_mass_kg', label: 'Muscle mass',  unit: 'kg' },
  { key: 'chest_cm',       label: 'Chest',        unit: 'cm' },
  { key: 'waist_cm',       label: 'Waist',        unit: 'cm' },
  { key: 'hips_cm',        label: 'Hips',         unit: 'cm' },
]

export function Measurements() {
  const [entries, setEntries] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({ measured_at: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/members/measurements')
      .then(r => r.json())
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    const body: Record<string, unknown> = { measured_at: form.measured_at }
    for (const f of FIELDS) {
      const v = parseFloat(form[f.key] ?? '')
      if (!isNaN(v)) body[f.key] = v
    }
    if (form.notes?.trim()) body.notes = form.notes.trim()

    const res = await fetch('/api/members/measurements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) return
    const data = await res.json()
    setEntries(e => [data, ...e])
    setShowForm(false)
    setForm({ measured_at: new Date().toISOString().slice(0, 10) })
  }

  async function remove(id: string) {
    await fetch(`/api/members/measurements?id=${id}`, { method: 'DELETE' })
    setEntries(e => e.filter(x => x.id !== id))
  }

  // Latest entry for summary
  const latest = entries[0]

  if (loading) return <div className="text-secondary text-sm">Loading…</div>

  return (
    <div>
      {/* Summary + trend */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {FIELDS.filter(f => latest[f.key] !== null).map(f => (
            <div key={f.key} className="rounded-lg border border-border bg-surface p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{latest[f.key]} <span className="text-secondary text-xs font-normal">{f.unit}</span></p>
                <p className="text-[10px] text-secondary mt-0.5">{f.label}</p>
              </div>
              <MiniTrend values={entries.slice().reverse().map(e => e[f.key])} />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowForm(s => !s)}
        className="w-full mb-4 py-2 text-sm text-secondary border border-dashed border-border rounded-btn hover:border-accent hover:text-accent transition-colors"
      >
        {showForm ? 'Cancel' : '+ Log measurement'}
      </button>

      {showForm && (
        <div className="border border-border rounded-xl p-4 mb-4 space-y-3">
          <div>
            <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1">Date</label>
            <input type="date" value={form.measured_at} onChange={e => setForm(f => ({ ...f, measured_at: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1">{f.label} ({f.unit})</label>
                <input
                  type="number" step="0.1" placeholder="-"
                  value={form[f.key] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1">Notes</label>
            <input type="text" placeholder="Optional notes" value={form.notes ?? ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent" />
          </div>
          <button onClick={save} disabled={saving}
            className="w-full py-2.5 bg-accent text-background text-sm font-bold rounded-btn disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {/* History */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-surface hover:bg-surface-raised transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-secondary">{new Date(e.measured_at + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="text-sm text-foreground mt-0.5 truncate">
                  {FIELDS.filter(f => e[f.key] !== null).map(f => `${f.label}: ${e[f.key]}${f.unit}`).join(' · ')}
                </p>
                {e.notes && <p className="text-[10px] text-secondary mt-0.5 truncate">{e.notes}</p>}
              </div>
              <button onClick={() => remove(e.id)} className="text-xs text-danger/50 hover:text-danger opacity-0 group-hover:opacity-100 transition-all shrink-0">×</button>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <p className="text-secondary text-sm text-center py-4">No measurements logged yet.</p>
      )}
    </div>
  )
}
