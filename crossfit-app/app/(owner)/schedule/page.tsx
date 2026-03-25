'use client'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

interface Template {
  id: string
  day_of_week: number
  local_time: string
  capacity: number
}

interface CapacityEditorProps {
  template: Template
  onSave: (id: string, capacity: number) => void
}

function CapacityEditor({ template, onSave }: CapacityEditorProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(template.capacity)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setValue(template.capacity)
    setError(null)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function cancel() {
    setEditing(false)
    setError(null)
  }

  async function save() {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/schedule/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: template.id, capacity: value }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError((data as { error?: string }).error ?? 'Save failed')
      return
    }
    onSave(template.id, value)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  }

  if (!editing) {
    return (
      <span className="text-white text-sm">
        <button
          onClick={startEdit}
          className="underline decoration-dotted hover:text-accent transition-colors cursor-pointer"
          title="Click to edit capacity"
        >
          {template.capacity}
        </button>
        {' '}spots
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="number"
        min={1}
        max={200}
        value={value}
        onChange={e => setValue(+e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-16 px-2 py-1 bg-background border border-accent-border rounded text-white text-sm focus:outline-none focus:border-accent"
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-accent hover:text-white transition-colors text-sm px-1"
        title="Save"
        aria-label="Save capacity"
      >
        ✓
      </button>
      {error && <span className="text-danger text-xs ml-1">{error}</span>}
    </span>
  )
}

export default function SchedulePage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [form, setForm] = useState({ dayOfWeek: 1, localTime: '06:00', capacity: 20 })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    const res = await fetch('/api/schedule/templates')
    const data = await res.json()
    setTemplates((data as { templates?: Template[] }).templates ?? [])
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/schedule/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    await loadTemplates()
  }

  async function handleRemove(id: string) {
    await fetch('/api/schedule/templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await loadTemplates()
  }

  function handleCapacitySaved(id: string, capacity: number) {
    setTemplates(ts => ts.map(t => t.id === id ? { ...t, capacity } : t))
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">Class Schedule</h1>
      <Card className="mb-6">
        <h2 className="text-white font-semibold mb-3">Add Class Time</h2>
        <form onSubmit={handleAdd} className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-secondary text-xs mb-1 block">Day</label>
            <select value={form.dayOfWeek} onChange={e => setForm(f => ({...f, dayOfWeek: +e.target.value}))}
              className="px-3 py-2 bg-background border border-accent-border rounded-btn text-white focus:outline-none focus:border-accent">
              {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-secondary text-xs mb-1 block">Time</label>
            <input type="time" value={form.localTime} onChange={e => setForm(f => ({...f, localTime: e.target.value}))}
              className="px-3 py-2 bg-background border border-accent-border rounded-btn text-white focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-secondary text-xs mb-1 block">Capacity</label>
            <input type="number" min={1} max={100} value={form.capacity} onChange={e => setForm(f => ({...f, capacity: +e.target.value}))}
              className="w-20 px-3 py-2 bg-background border border-accent-border rounded-btn text-white focus:outline-none focus:border-accent" />
          </div>
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <div className="space-y-2">
        {templates.map(t => (
          <Card key={t.id} className="flex items-center justify-between">
            <span className="text-white text-sm">
              {DAYS[t.day_of_week - 1]} at {t.local_time} — <CapacityEditor template={t} onSave={handleCapacitySaved} />
            </span>
            <Button variant="danger" onClick={() => handleRemove(t.id)}>Remove</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
