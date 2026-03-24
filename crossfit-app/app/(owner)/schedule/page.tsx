'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default function SchedulePage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [form, setForm] = useState({ dayOfWeek: 1, localTime: '06:00', capacity: 20 })

  useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    const res = await fetch('/api/schedule/templates')
    const data = await res.json()
    setTemplates(data.templates ?? [])
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
            <span className="text-white text-sm">{DAYS[t.day_of_week - 1]} at {t.local_time} — {t.capacity} spots</span>
            <Button variant="danger" onClick={() => handleRemove(t.id)}>Remove</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
