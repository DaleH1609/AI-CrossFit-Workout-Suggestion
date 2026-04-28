'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import type { SpecialtyProgram } from '@/lib/types'

function getMondayOfCurrentWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<SpecialtyProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newWeek, setNewWeek] = useState(getMondayOfCurrentWeek())
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const loadPrograms = useCallback(async () => {
    const res = await fetch('/api/programs')
    if (res.ok) {
      const data = await res.json() as { programs: SpecialtyProgram[] }
      setPrograms(data.programs)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadPrograms() }, [loadPrograms])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!newName.trim()) { setFormError('Name is required'); return }
    setCreating(true)
    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), weekStart: newWeek }),
    })
    if (res.ok) {
      const data = await res.json() as { program: SpecialtyProgram }
      router.push(`/programs/${data.program.id}`)
    } else {
      const data = await res.json() as { error?: string }
      setFormError(data.error ?? 'Failed to create program')
      setCreating(false)
    }
  }

  async function handlePublishToggle(program: SpecialtyProgram) {
    const method = program.status === 'published' ? 'DELETE' : 'POST'
    const res = await fetch(`/api/programs/${program.id}/publish`, { method })
    if (res.ok) {
      const data = await res.json() as { program: SpecialtyProgram }
      setPrograms(prev => prev.map(p => p.id === program.id ? data.program : p))
    } else {
      toast('Failed to update program status', 'error')
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPrograms(prev => prev.filter(p => p.id !== id))
      setConfirmDelete(null)
    } else {
      toast('Failed to delete program', 'error')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-foreground">Programs</h1>
          <p className="text-secondary text-sm mt-1">Specialty programs published to your members.</p>
        </div>
        <button
          onClick={() => { setShowForm(f => !f); setFormError('') }}
          className="inline-flex items-center px-4 py-2 rounded-btn text-sm font-medium bg-accent text-background hover:bg-accent/90 transition-all"
        >
          {showForm ? 'Cancel' : 'New Program'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-surface border border-border rounded-card flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs text-secondary uppercase tracking-wide">Program name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Running, Hyrox, Weightlifting"
              className="bg-background border border-border rounded-btn px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary uppercase tracking-wide">Week starting</label>
            <input
              type="date"
              value={newWeek}
              onChange={e => setNewWeek(e.target.value)}
              className="bg-background border border-border rounded-btn px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            {formError && <span className="text-danger text-xs">{formError}</span>}
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-btn text-sm font-medium bg-accent text-background hover:bg-accent/90 disabled:opacity-50 transition-all"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-16 bg-surface border border-border rounded-card animate-pulse" />)}
        </div>
      ) : programs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-foreground font-medium mb-1">No programs yet</p>
          <p className="text-secondary text-sm">Create your first specialty program above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {programs.map(program => (
            <div key={program.id} className="flex items-center gap-3 bg-surface border border-border rounded-card px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{program.name}</p>
                <p className="text-secondary text-xs">Week of {program.week_start}</p>
              </div>
              <Badge variant={program.status as 'draft' | 'published'} label={program.status.charAt(0).toUpperCase() + program.status.slice(1)} />
              <Link
                href={`/programs/${program.id}`}
                className="text-xs text-secondary hover:text-foreground border border-border hover:border-accent rounded px-2 py-1 transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={() => handlePublishToggle(program)}
                className="text-xs text-secondary hover:text-foreground border border-border hover:border-accent rounded px-2 py-1 transition-colors"
              >
                {program.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
              {confirmDelete === program.id ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-secondary">Delete?</span>
                  <button onClick={() => handleDelete(program.id)} className="text-danger font-semibold">Yes</button>
                  <button onClick={() => setConfirmDelete(null)} className="text-secondary">No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(program.id)}
                  className="text-xs text-danger hover:text-foreground border border-border hover:border-danger rounded px-2 py-1 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
