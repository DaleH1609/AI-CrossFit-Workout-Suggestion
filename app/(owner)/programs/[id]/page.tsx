'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import type { SpecialtyProgram, ProgramDay } from '@/lib/types'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function ProgramEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [program, setProgram] = useState<SpecialtyProgram | null>(null)
  const [localDays, setLocalDays] = useState<ProgramDay[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [publishing, setPublishing] = useState(false)
  const { toast } = useToast()

  useEffect(() => { params.then(p => setId(p.id)) }, [params])

  const loadProgram = useCallback(async (programId: string) => {
    const res = await fetch(`/api/programs/${programId}`)
    if (res.ok) {
      const data = await res.json() as { program: SpecialtyProgram }
      setProgram(data.program)
      setNameValue(data.program.name)
      const filled = DAYS.map(dayName => {
        const existing = data.program.days.find(d => d.day === dayName)
        return existing ?? { day: dayName, content: '' }
      })
      setLocalDays(filled)
    }
    setLoading(false)
  }, [])

  useEffect(() => { if (id) loadProgram(id) }, [id, loadProgram])

  async function saveName() {
    if (!program || !nameValue.trim()) { setEditingName(false); setNameValue(program?.name ?? ''); return }
    if (nameValue === program.name) { setEditingName(false); return }
    const res = await fetch(`/api/programs/${program.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameValue.trim() }),
    })
    if (res.ok) {
      const data = await res.json() as { program: SpecialtyProgram }
      setProgram(data.program)
      setNameValue(data.program.name)
    } else {
      toast('Failed to save name', 'error')
      setNameValue(program.name)
    }
    setEditingName(false)
  }

  async function saveDayContent(day: string, content: string) {
    if (!program) return
    const updatedDays = localDays.map(d => d.day === day ? { ...d, content } : d)
    const res = await fetch(`/api/programs/${program.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: updatedDays }),
    })
    if (res.ok) {
      const data = await res.json() as { program: SpecialtyProgram }
      setProgram(data.program)
    } else {
      const data = await res.json() as { error?: string }
      toast(data.error ?? 'Failed to save', 'error')
    }
  }

  async function handlePublishToggle() {
    if (!program || publishing) return
    setPublishing(true)
    const method = program.status === 'published' ? 'DELETE' : 'POST'
    const res = await fetch(`/api/programs/${program.id}/publish`, { method })
    if (res.ok) {
      const data = await res.json() as { program: SpecialtyProgram }
      setProgram(data.program)
    } else {
      toast('Failed to update status', 'error')
    }
    setPublishing(false)
  }

  if (loading) return null
  if (!program) return <p className="text-secondary text-sm">Program not found.</p>

  const isPublished = program.status === 'published'

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/programs" className="text-xs text-secondary hover:text-foreground transition-colors mb-2 inline-block">
            ← Programs
          </Link>
          {editingName ? (
            <input
              autoFocus
              type="text"
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') { setEditingName(false); setNameValue(program.name) }
              }}
              className="font-display text-3xl text-foreground bg-transparent border-b border-accent focus:outline-none w-full max-w-sm"
            />
          ) : (
            <h1
              className={`font-display text-3xl text-foreground ${!isPublished ? 'cursor-text hover:opacity-70' : ''} transition-opacity`}
              onClick={() => { if (!isPublished) setEditingName(true) }}
              title={isPublished ? undefined : 'Click to edit name'}
            >
              {program.name}
            </h1>
          )}
          <p className="text-secondary text-sm mt-1">Week of {program.week_start}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={program.status as 'draft' | 'published'} label={program.status.charAt(0).toUpperCase() + program.status.slice(1)} />
          <button
            onClick={handlePublishToggle}
            disabled={publishing}
            className="inline-flex items-center px-4 py-2 rounded-btn text-sm font-medium bg-accent text-background hover:bg-accent/90 disabled:opacity-50 transition-all"
          >
            {publishing ? 'Saving…' : isPublished ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {isPublished && (
        <div className="mb-6 px-4 py-3 bg-accent-5 border border-accent-20 rounded-card text-sm text-accent">
          This program is live. Unpublish to make edits.
        </div>
      )}

      <div className="space-y-4">
        {localDays.map(({ day, content }) => (
          <div key={day} className="bg-surface border border-border rounded-card p-4">
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">{day}</p>
            <textarea
              value={content}
              onChange={e => {
                if (isPublished) return
                const updated = localDays.map(d => d.day === day ? { ...d, content: e.target.value } : d)
                setLocalDays(updated)
              }}
              onBlur={e => { if (!isPublished) saveDayContent(day, e.target.value) }}
              readOnly={isPublished}
              rows={4}
              placeholder={isPublished ? '' : 'Enter workout content…'}
              className="w-full bg-background border border-border rounded-btn px-3 py-2 text-sm text-foreground placeholder-foreground-50 focus:outline-none focus:border-accent transition-colors resize-none read-only:opacity-60 read-only:cursor-default"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
