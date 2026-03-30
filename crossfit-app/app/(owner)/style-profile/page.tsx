'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Card } from '@/components/ui/card'

export default function StyleProfilePage() {
  const [examples, setExamples] = useState<{ id: string; raw_text: string }[]>([])
  const [newText, setNewText] = useState('')
  const [showNewProgramModal, setShowNewProgramModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [pendingSamples, setPendingSamples] = useState<string[]>([])
  const [selectedSamples, setSelectedSamples] = useState<Set<number>>(new Set())
  const [addingSelected, setAddingSelected] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadExamples() }, [])

  async function loadExamples() {
    const res = await fetch('/api/style')
    const data = await res.json()
    setExamples(data.examples ?? [])
  }

  async function handleAdd() {
    if (!newText.trim()) return
    await fetch('/api/style', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawText: newText }) })
    setNewText('')
    await loadExamples()
  }

  async function handleDelete(id: string) {
    await fetch('/api/style', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await loadExamples()
  }

  async function handleNewProgram() {
    await fetch('/api/style/new-program', { method: 'POST' })
    setShowNewProgramModal(false)
    await loadExamples()
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError('')
    setPendingSamples([])
    setSelectedSamples(new Set())
    const res = await fetch('/api/style/generate-samples', { method: 'POST' })
    const data = await res.json()
    setGenerating(false)
    if (!res.ok) { setGenerateError(data.error ?? 'Failed to generate examples'); return }
    setPendingSamples(data.samples)
    setSelectedSamples(new Set(data.samples.map((_: string, i: number) => i)))
  }

  async function handleAddSelected() {
    setGenerateError('')
    setAddingSelected(true)
    const toAdd = pendingSamples.filter((_, i) => selectedSamples.has(i))
    try {
      await Promise.all(
        toAdd.map(rawText =>
          fetch('/api/style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawText }),
          })
        )
      )
    } catch {
      setGenerateError('Some examples failed to save')
    }
    setPendingSamples([])
    setSelectedSamples(new Set())
    setAddingSelected(false)
    await loadExamples()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-white">Style Profile</h1>
        <Button variant="danger" onClick={() => setShowNewProgramModal(true)}>Start New Program</Button>
      </div>

      <Card className="mb-6">
        <p className="text-secondary text-sm mb-3">Paste a workout example below. Add at least 3 to enable generation.</p>
        <textarea value={newText} onChange={e => setNewText(e.target.value)}
          placeholder={"Monday\nPart A\nRomanian Deadlift\n\nPart B\n500m Row..."}
          rows={8}
          className="w-full bg-background border border-accent-border rounded-btn p-3 text-white text-sm font-mono placeholder-secondary focus:outline-none focus:border-accent resize-none"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={handleAdd} disabled={!newText.trim()}>Add Example</Button>
        </div>
      </Card>

      {examples.length < 3 && (
        <div className="mb-6">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 text-sm text-accent border border-accent-border rounded-btn px-4 py-2 hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating && (
              <svg className="animate-spin h-4 w-4 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {generating ? 'Generating...' : 'Generate examples for me'}
          </button>
          {generateError && <p className="text-danger text-xs mt-2">{generateError}</p>}
          {pendingSamples.length > 0 && (
            <div className="mt-4 space-y-3">
              {pendingSamples.map((sample, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label={`Select sample ${i + 1}`}
                    checked={selectedSamples.has(i)}
                    onChange={() => {
                      const next = new Set(selectedSamples)
                      next.has(i) ? next.delete(i) : next.add(i)
                      setSelectedSamples(next)
                    }}
                    className="mt-1 accent-accent"
                  />
                  <Card className="flex-1">
                    <pre className="text-white/80 text-sm whitespace-pre-wrap font-mono">{sample}</pre>
                  </Card>
                </label>
              ))}
              <div className="flex justify-end">
                <Button
                  onClick={handleAddSelected}
                  disabled={selectedSamples.size === 0 || addingSelected}
                >
                  {addingSelected ? 'Adding...' : 'Add selected'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {examples.map((ex, i) => (
          <Card key={ex.id} className="flex items-start gap-4">
            <span className="text-accent font-display text-lg">{i + 1}</span>
            <pre className="flex-1 text-white/80 text-sm whitespace-pre-wrap font-mono">{ex.raw_text}</pre>
            <Button variant="danger" onClick={() => handleDelete(ex.id)}>Remove</Button>
          </Card>
        ))}
        {examples.length === 0 && <p className="text-secondary text-sm">No examples yet. Add at least 3 to enable workout generation.</p>}
      </div>

      <Modal
        open={showNewProgramModal}
        title="Start a New Program?"
        description="This will archive all current style examples and workout history. Future bookings are not affected. You'll need to add new examples before generating again."
        confirmLabel="Start New Program"
        confirmVariant="danger"
        onConfirm={handleNewProgram}
        onCancel={() => setShowNewProgramModal(false)}
      />
    </div>
  )
}
