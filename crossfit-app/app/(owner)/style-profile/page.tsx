'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Card } from '@/components/ui/card'

export default function StyleProfilePage() {
  const [examples, setExamples] = useState<{ id: string; raw_text: string }[]>([])
  const [newText, setNewText] = useState('')
  const [showNewProgramModal, setShowNewProgramModal] = useState(false)

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
