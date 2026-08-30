'use client'
import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { Combobox } from '@/components/ui/combobox'

interface Challenge {
  id: string
  title: string
  description: string | null
  month: string
  type: string
  target: number | null
  active: boolean
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function monthLabel(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function firstOfCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', month: firstOfCurrentMonth(), type: 'classes', target: '' })
  const { toast } = useToast()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/challenges')
    if (res.ok) setChallenges(await res.json())
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/admin/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, target: form.target ? parseInt(form.target) : null }),
    })
    setCreating(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast(data.error ?? 'Failed to create challenge', 'error')
      return
    }
    toast('Challenge created', 'success')
    setShowForm(false)
    setForm({ title: '', description: '', month: firstOfCurrentMonth(), type: 'classes', target: '' })
    await load()
  }

  async function toggleActive(c: Challenge) {
    await fetch('/api/admin/challenges', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, active: !c.active }),
    })
    await load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this challenge?')) return
    await fetch(`/api/admin/challenges?id=${id}`, { method: 'DELETE' })
    toast('Deleted', 'success')
    await load()
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display uppercase text-foreground leading-[0.9] tracking-[-0.02em] text-[clamp(2rem,4vw,3rem)]">Monthly challenges</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 bg-accent text-on-accent text-sm font-bold tracking-wider rounded-btn hover:bg-accent-90 transition-colors active:scale-[0.98]"
        >
          {showForm ? 'Cancel' : '+ New Challenge'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 border border-border rounded-xl p-6 space-y-4 bg-surface">
          <h2 className="text-sm font-semibold text-foreground mb-2">Create challenge</h2>
          <div>
            <label className="block text-xs text-secondary mb-1">Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Most classes in June"
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional details"
              className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1">Month *</label>
              <input
                type="month"
                required
                value={form.month.slice(0, 7)}
                onChange={e => setForm(f => ({ ...f, month: e.target.value + '-01' }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Type</label>
              <Combobox
                ariaLabel="Challenge type"
                value={form.type}
                onChange={v => v && setForm(f => ({ ...f, type: v }))}
                className="w-full px-3 py-2.5 text-sm"
                options={[
                  { value: 'classes', label: 'Most classes' },
                  { value: 'streak', label: 'Longest streak' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Target (optional)</label>
              <input
                type="number"
                min={1}
                value={form.target}
                onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                placeholder="e.g. 20"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-accent text-on-accent text-sm font-bold tracking-wider rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {creating ? 'Creating…' : 'Create Challenge'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-secondary text-sm">Loading…</p>
      ) : challenges.length === 0 ? (
        <div className="border border-border rounded-xl py-16 text-center">
          <p className="text-secondary text-sm">No challenges yet.</p>
          <p className="text-secondary text-xs mt-1">Create one to engage your members.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {challenges.map(c => (
            <div key={c.id} className="px-5 py-4 border-b border-border last:border-0 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${c.active ? 'bg-accent-5 text-accent border border-accent-20' : 'bg-surface-raised text-secondary border border-border'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-secondary">{monthLabel(c.month)}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{c.title}</p>
                {c.description && <p className="text-xs text-secondary mt-0.5">{c.description}</p>}
                <p className="text-xs text-secondary mt-1">
                  Type: {c.type === 'classes' ? 'Most classes' : 'Longest streak'}
                  {c.target ? ` · Target: ${c.target}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(c)}
                  className="text-xs text-secondary hover:text-foreground transition-colors"
                >
                  {c.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-danger/60 hover:text-danger transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
