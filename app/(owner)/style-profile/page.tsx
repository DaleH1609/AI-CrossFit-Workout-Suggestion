'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'

const MIN_EXAMPLES = 3

export default function StyleProfilePage() {
  const [examples, setExamples] = useState<{ id: string; raw_text: string }[]>([])
  const [gymType, setGymType] = useState<'crossfit' | 'hyrox'>('crossfit')
  const [newText, setNewText] = useState('')
  const [showNewProgramModal, setShowNewProgramModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [pendingSamples, setPendingSamples] = useState<string[]>([])
  const [selectedSamples, setSelectedSamples] = useState<Set<number>>(new Set())
  const [addingSelected, setAddingSelected] = useState(false)
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)
  const [selectedDay, setSelectedDay] = useState('Monday')
  const { toast } = useToast()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadExamples() }, [])

  async function loadExamples() {
    try {
      const res = await fetch('/api/style')
      if (!res.ok) {
        toast('Failed to load style examples', 'error')
        return
      }
      const data = await res.json()
      setExamples(data.examples ?? [])
      if (data.gymType) setGymType(data.gymType)
    } catch (err) {
      console.error('[style-profile] load failed', err)
      toast('Network error — could not load examples', 'error')
    }
  }

  async function handleAdd() {
    if (!newText.trim()) return
    setAdding(true)
    setAddError('')
    const rawText = `${selectedDay}\n${newText.trim()}`
    const res = await fetch('/api/style', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawText }) })
    if (res.ok) {
      setNewText('')
      await loadExamples()
    } else {
      const data = await res.json()
      setAddError((data as { error?: string }).error || 'Failed to add example')
    }
    setAdding(false)
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch('/api/style', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Failed to delete example', 'error')
      }
    } catch (err) {
      console.error('[style-profile] delete failed', err)
      toast('Network error — could not delete example', 'error')
    } finally {
      await loadExamples()
    }
  }

  async function handleNewProgram() {
    try {
      const res = await fetch('/api/style/new-program', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast(data.error ?? 'Failed to start new program', 'error')
      } else {
        toast('Program archived — start adding fresh examples', 'success')
      }
    } catch (err) {
      console.error('[style-profile] new-program failed', err)
      toast('Network error — could not start new program', 'error')
    } finally {
      setShowNewProgramModal(false)
      await loadExamples()
    }
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
      const results = await Promise.all(
        toAdd.map(rawText =>
          fetch('/api/style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawText }),
          }).then(r => r.ok).catch(() => false)
        )
      )
      const failures = results.filter(ok => !ok).length
      if (failures > 0) {
        setGenerateError(`${failures} of ${toAdd.length} example${failures === 1 ? '' : 's'} failed to save`)
      } else {
        toast(`Added ${toAdd.length} example${toAdd.length === 1 ? '' : 's'}`, 'success')
      }
    } catch (err) {
      console.error('[style-profile] add-selected failed', err)
      setGenerateError('Some examples failed to save')
    }
    setPendingSamples([])
    setSelectedSamples(new Set())
    setAddingSelected(false)
    await loadExamples()
  }

  const readyToGenerate = examples.length >= MIN_EXAMPLES
  const progressPercent = Math.min((examples.length / MIN_EXAMPLES) * 100, 100)
  const gymLabel = gymType === 'hyrox' ? 'Hyrox' : 'CrossFit'

  return (
    <div className="max-w-3xl mx-auto">

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-foreground">Style profile</h1>
            <p className="text-secondary text-sm mt-1.5 max-w-xl">
              Teach the AI your coaching style by adding real {gymLabel} workouts. The more examples you add, the better the generated programs reflect your approach.
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium uppercase tracking-wider px-2.5 py-1 rounded border border-border text-accent">
            {gymLabel} gym
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-secondary uppercase tracking-wider">Training examples</span>
            <span className={`text-xs font-medium tabular-nums ${readyToGenerate ? 'text-accent' : 'text-secondary'}`}>
              {readyToGenerate
                ? `${examples.length} examples — ready`
                : `${examples.length} / ${MIN_EXAMPLES} minimum`}
            </span>
          </div>
          <div className="h-0.5 bg-surface rounded-full overflow-hidden border border-border">
            <div
              className="h-full bg-accent transition-all duration-700 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Add Example */}
      <Card className="mb-6">
        <div className="mb-3">
          <label className="block text-sm font-medium text-foreground mb-0.5">
            Add a workout example
          </label>
          <p className="text-xs text-secondary">
            Paste a full {gymLabel} session — working sets, conditioning, any coaching notes.
          </p>
        </div>

        <div className="mb-3">
          <label className="block text-xs text-secondary uppercase tracking-wider mb-1">Day of week</label>
          <select
            value={selectedDay}
            onChange={e => setSelectedDay(e.target.value)}
            className="bg-background border border-border rounded-btn px-3 py-2 text-foreground text-sm focus:outline-none focus:border-accent"
          >
            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <textarea
          value={newText}
          onChange={e => { setNewText(e.target.value); setAddError('') }}
          placeholder={gymType === 'hyrox'
            ? 'Warm-up: Run 400m, mobility work\n\nMain\nRun 1km\nSki Erg 1000m\nSled Push 50m...'
            : 'Part A — Strength\nBack Squat 5×5 @ 80%\n\nPart B — Conditioning\n21-15-9\nThrusters 43/30kg\nPull-ups'}
          rows={9}
          className="w-full bg-background border border-border rounded-btn p-3 text-foreground text-sm font-mono placeholder-secondary focus:outline-none focus:border-accent resize-none transition-colors duration-150"
        />

        {addError && (
          <div className="mt-2 px-3 py-2 rounded border border-danger/30 bg-danger/5 text-xs text-danger flex items-start gap-2">
            <span className="shrink-0 mt-0.5" aria-hidden="true">!</span>
            <span>{addError}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-secondary tabular-nums">
            {newText.trim() ? `${newText.trim().split('\n').filter(l => l.trim()).length} lines` : ''}
          </span>
          <Button onClick={handleAdd} disabled={!newText.trim() || adding}>
            {adding ? (
              <span className="flex items-center gap-2">
                <svg aria-hidden="true" className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Checking…
              </span>
            ) : 'Add Example'}
          </Button>
        </div>
      </Card>

      {/* AI Generation — only before minimum is reached */}
      {!readyToGenerate && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-secondary uppercase tracking-widest">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Card className="border-dashed">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Generate examples with AI</p>
                <p className="text-xs text-secondary mt-0.5">
                  Let the AI create sample {gymLabel} workouts you can review and save as a starting point.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="shrink-0 flex items-center gap-2 text-sm text-accent border border-border rounded-btn px-4 py-2 hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                {generating && (
                  <svg aria-hidden="true" className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>

            {generateError && (
              <p className="text-danger text-xs mt-3">{generateError}</p>
            )}
          </Card>

          {pendingSamples.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-secondary mb-3">
                Review the generated examples and select which ones to save:
              </p>
              <div className="space-y-3">
                {pendingSamples.map((sample, i) => (
                  <label key={i} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      aria-label={`Select sample ${i + 1}`}
                      checked={selectedSamples.has(i)}
                      onChange={() => {
                        const next = new Set(selectedSamples)
                        if (next.has(i)) { next.delete(i) } else { next.add(i) }
                        setSelectedSamples(next)
                      }}
                      className="mt-1 accent-accent w-4 h-4 shrink-0"
                    />
                    <Card className={`flex-1 transition-colors duration-150 ${selectedSamples.has(i) ? 'border-accent-40' : ''}`}>
                      <pre className="text-foreground-70 text-sm whitespace-pre-wrap font-mono leading-relaxed">{sample}</pre>
                    </Card>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-secondary tabular-nums">
                  {selectedSamples.size} of {pendingSamples.length} selected
                </span>
                <Button
                  onClick={handleAddSelected}
                  disabled={selectedSamples.size === 0 || addingSelected}
                >
                  {addingSelected
                    ? 'Adding…'
                    : `Add ${selectedSamples.size} example${selectedSamples.size !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved Examples */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium text-secondary uppercase tracking-wider">Saved examples</h2>
          {examples.length > 0 && (
            <span className="text-xs text-secondary tabular-nums">
              {examples.length} {examples.length === 1 ? 'example' : 'examples'}
            </span>
          )}
        </div>

        {examples.length === 0 ? (
          <div className="border border-border rounded-xl py-12 text-center">
            <p className="text-secondary text-sm">No examples saved yet.</p>
            <p className="text-secondary/50 text-xs mt-1">
              Add at least {MIN_EXAMPLES} workouts to unlock AI generation.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
            {examples.map((ex, i) => {
              const lines = ex.raw_text.split('\n')
              const dayLine = lines[0] ?? ''
              const body = lines.slice(1).join('\n').trim()
              return (
                <div key={ex.id} className="group flex items-start gap-4 px-5 py-4 hover:bg-surface-raised transition-colors">
                  <div className="shrink-0 pt-0.5">
                    <span className="text-[10px] font-semibold tracking-widest text-accent uppercase">{dayLine || `Example ${i + 1}`}</span>
                  </div>
                  <pre className="flex-1 text-foreground/60 text-sm whitespace-pre-wrap font-mono leading-relaxed min-w-0 italic">{body || ex.raw_text}</pre>
                  <button
                    onClick={() => handleDelete(ex.id)}
                    className="shrink-0 text-secondary/40 hover:text-danger text-lg leading-none opacity-0 group-hover:opacity-100 transition-all duration-150 mt-0.5"
                    title="Remove example"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="border border-danger/20 rounded-xl p-5">
        <p className="text-[10px] font-semibold tracking-widest text-danger/60 uppercase mb-3">Danger Zone</p>
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-foreground">Start a new program</p>
            <p className="text-xs text-secondary mt-0.5 max-w-sm">
              Archives all current style examples and workout history. Future bookings are unaffected.
            </p>
          </div>
          <Button variant="danger" className="shrink-0" onClick={() => setShowNewProgramModal(true)}>
            Start New Program
          </Button>
        </div>
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
