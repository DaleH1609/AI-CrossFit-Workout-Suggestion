'use client'
import { useState } from 'react'
import type { ClassType } from '@/lib/types'

const PALETTE = [
  '#eab308', // yellow
  '#3b82f6', // blue
  '#22c55e', // green
  '#a855f7', // purple
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
]

interface Props {
  classTypes: ClassType[]
  onChange: (types: ClassType[]) => void
}

export function ClassTypesManager({ classTypes, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PALETTE[1])
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    setError('')
    const res = await fetch('/api/class-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    })
    if (res.ok) {
      const data = await res.json()
      onChange([...classTypes, data.classType])
      setNewName('')
      setNewColor(PALETTE[1])
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to add')
    }
    setAdding(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch('/api/class-types', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) onChange(classTypes.filter(t => t.id !== id))
  }

  async function handleColorChange(id: string, color: string) {
    onChange(classTypes.map(t => t.id === id ? { ...t, color } : t))
    await fetch('/api/class-types', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, color }),
    })
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm text-secondary hover:text-foreground transition-colors mb-2"
      >
        <span className="text-xs uppercase tracking-wider font-medium">Class Types</span>
        <span className="text-xs text-accent border border-border rounded px-1.5 py-0.5 tabular-nums">
          {classTypes.length}
        </span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border border-border rounded-card p-4 bg-surface space-y-4">
          {/* Existing types */}
          <div className="flex flex-wrap gap-2">
            {classTypes.map(type => (
              <div
                key={type.id}
                className="flex items-center gap-1.5 border border-border rounded-btn px-2 py-1.5 bg-background"
              >
                {/* Colour picker inline */}
                <div className="relative group/swatch">
                  <div
                    className="w-3.5 h-3.5 rounded-full cursor-pointer ring-1 ring-foreground-10"
                    style={{ backgroundColor: type.color }}
                  />
                  {/* Palette dropdown on hover */}
                  <div className="absolute left-0 top-5 z-20 hidden group-hover/swatch:flex flex-wrap gap-1 p-2 bg-surface border border-border rounded shadow-lg w-32">
                    {PALETTE.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleColorChange(type.id, c)}
                        className="w-5 h-5 rounded-full ring-1 ring-foreground-10 hover:ring-foreground transition-all"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-foreground text-xs">{type.name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(type.id)}
                  className="text-secondary hover:text-danger text-xs ml-0.5 leading-none"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Add new type */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => { setNewName(e.target.value); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder="New class type…"
              className="flex-1 bg-background border border-border rounded-btn px-3 py-1.5 text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent"
            />
            {/* Colour picker for new type */}
            <div className="flex gap-1">
              {PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full ring-1 transition-all ${newColor === c ? 'ring-foreground scale-110' : 'ring-foreground-10 hover:ring-foreground'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim() || adding}
              className="text-xs text-accent border border-border rounded-btn px-3 py-1.5 hover:border-accent disabled:opacity-40 transition-colors"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  )
}
