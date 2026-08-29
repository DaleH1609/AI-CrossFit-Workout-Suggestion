'use client'
import { useState, useEffect } from 'react'

interface Note {
  id: string
  body: string
  created_at: string
}

export function MemberNotes({ memberId }: { memberId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/members/notes?memberId=' + memberId)
    if (res.ok) setNotes(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [memberId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    const res = await fetch('/api/admin/members/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, text }),
    })
    if (res.ok) { setText(''); await load() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await fetch('/api/admin/members/notes?id=' + id, { method: 'DELETE' })
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a private coach note…"
          rows={3}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-secondary resize-none focus:outline-none focus:border-accent transition-colors"
        />
        <button type="submit" disabled={saving || !text.trim()}
          className="mt-2 px-3 py-1.5 bg-accent text-on-accent text-xs font-bold rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add Note'}
        </button>
      </form>

      {loading ? (
        <p className="text-secondary text-sm">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-secondary-60 text-sm italic">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="rounded-lg border border-border bg-surface p-3 group">
              <p className="text-sm text-foreground whitespace-pre-wrap">{note.body}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-secondary text-xs">
                  {new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <button onClick={() => handleDelete(note.id)}
                  className="text-danger text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
