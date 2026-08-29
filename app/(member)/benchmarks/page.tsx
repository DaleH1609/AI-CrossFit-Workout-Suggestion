'use client'
import { useState, useEffect } from 'react'

interface Benchmark {
  id: string
  name: string
  category: string
  unit: string
  best: { score_value: string; rx: boolean; recorded_on: string } | null
}

interface Goal {
  id: string
  title: string
  target: string
  achieved: boolean
  achieved_at: string | null
  due_date: string | null
  created_at: string
}

const UNIT_PLACEHOLDER: Record<string, string> = {
  time: 'e.g. 2:45',
  reps: 'e.g. 42',
  weight: 'e.g. 225 lbs',
  rounds_reps: 'e.g. 23+5',
}

export default function BenchmarksPage() {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'benchmarks' | 'goals'>('benchmarks')

  // Benchmark entry form
  const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark | null>(null)
  const [scoreValue, setScoreValue] = useState('')
  const [rx, setRx] = useState(true)
  const [saving, setSaving] = useState(false)

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDue, setGoalDue] = useState('')
  const [goalSaving, setGoalSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/members/benchmarks').then(r => r.json()),
      fetch('/api/members/goals').then(r => r.json()),
    ]).then(([b, g]) => {
      setBenchmarks(b)
      setGoals(g)
      setLoading(false)
    })
  }, [])

  const categories = Array.from(new Set(benchmarks.map(b => b.category))).sort()

  async function handleBenchmarkSave(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBenchmark) return
    setSaving(true)
    await fetch('/api/members/benchmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ benchmarkId: selectedBenchmark.id, scoreValue, rx }),
    })
    const updated = await fetch('/api/members/benchmarks').then(r => r.json())
    setBenchmarks(updated)
    setSelectedBenchmark(null)
    setScoreValue('')
    setRx(true)
    setSaving(false)
  }

  async function handleGoalCreate(e: React.FormEvent) {
    e.preventDefault()
    setGoalSaving(true)
    const res = await fetch('/api/members/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: goalTitle, target: goalTarget, dueDate: goalDue || null }),
    })
    if (res.ok) {
      const g = await res.json()
      setGoals(prev => [g, ...prev])
      setGoalTitle(''); setGoalTarget(''); setGoalDue('')
      setShowGoalForm(false)
    }
    setGoalSaving(false)
  }

  async function toggleGoal(goal: Goal) {
    await fetch(`/api/members/goals?id=${goal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ achieved: !goal.achieved }),
    })
    setGoals(prev => prev.map(g => g.id === goal.id
      ? { ...g, achieved: !g.achieved, achieved_at: !g.achieved ? new Date().toISOString() : null }
      : g
    ))
  }

  async function deleteGoal(id: string) {
    await fetch(`/api/members/goals?id=${id}`, { method: 'DELETE' })
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  if (loading) return <div className="max-w-lg"><p className="text-secondary text-sm">Loading…</p></div>

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-3xl text-foreground mb-6">Progress</h1>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-8 bg-surface rounded-lg p-1 w-fit">
        {(['benchmarks', 'goals'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium capitalize rounded transition-colors ${
              tab === t ? 'bg-accent text-on-accent' : 'text-secondary hover:text-foreground'
            }`}>{t}</button>
        ))}
      </div>

      {tab === 'benchmarks' && (
        <div>
          {selectedBenchmark ? (
            <form onSubmit={handleBenchmarkSave} className="rounded-xl border border-border bg-surface p-5 mb-6">
              <h2 className="font-display text-lg text-foreground mb-1">{selectedBenchmark.name}</h2>
              <p className="text-secondary text-xs mb-4 capitalize">{selectedBenchmark.category} · {selectedBenchmark.unit}</p>
              <div className="space-y-3">
                <input
                  value={scoreValue}
                  onChange={e => setScoreValue(e.target.value)}
                  placeholder={UNIT_PLACEHOLDER[selectedBenchmark.unit] ?? 'Score'}
                  required
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors"
                />
                <div className="flex gap-2">
                  {['Rx', 'Scaled'].map(label => (
                    <button key={label} type="button"
                      onClick={() => setRx(label === 'Rx')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-btn border transition-colors ${
                        (label === 'Rx') === rx
                          ? 'bg-accent text-on-accent border-accent'
                          : 'text-secondary border-border hover:border-accent/50'
                      }`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-accent text-on-accent text-sm font-bold rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Score'}
                </button>
                <button type="button" onClick={() => setSelectedBenchmark(null)}
                  className="text-sm text-secondary hover:text-foreground transition-colors">Cancel</button>
              </div>
            </form>
          ) : null}

          {categories.map(cat => (
            <div key={cat} className="mb-6">
              <p className="text-xs text-secondary uppercase tracking-wider mb-3 capitalize">{cat}</p>
              <div className="space-y-1">
                {benchmarks.filter(b => b.category === cat).map(b => (
                  <button key={b.id} onClick={() => { setSelectedBenchmark(b); setScoreValue('') }}
                    className="w-full flex items-center justify-between py-3 border-b border-border last:border-0 hover:bg-surface/50 transition-colors group text-left">
                    <span className="text-sm text-foreground">{b.name}</span>
                    {b.best ? (
                      <div className="flex items-center gap-2 text-right">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${b.best.rx ? 'bg-accent-10 text-accent' : 'bg-surface text-secondary border border-border'}`}>
                          {b.best.rx ? 'Rx' : 'Sc'}
                        </span>
                        <span className="font-mono text-sm text-foreground">{b.best.score_value}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-secondary group-hover:text-foreground transition-colors">+ Log</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'goals' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-secondary">{goals.filter(g => !g.achieved).length} active goals</p>
            <button onClick={() => setShowGoalForm(!showGoalForm)}
              className="text-sm text-accent hover:underline">
              {showGoalForm ? 'Cancel' : '+ Add Goal'}
            </button>
          </div>

          {showGoalForm && (
            <form onSubmit={handleGoalCreate} className="rounded-xl border border-border bg-surface p-4 mb-6 space-y-3">
              <input value={goalTitle} onChange={e => setGoalTitle(e.target.value)} required
                placeholder="Goal title (e.g. Sub 3:00 Fran)"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors" />
              <input value={goalTarget} onChange={e => setGoalTarget(e.target.value)} required
                placeholder="Success looks like… (e.g. Complete Fran in under 3 minutes Rx)"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors" />
              <input type="date" value={goalDue} onChange={e => setGoalDue(e.target.value)}
                className="px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent transition-colors" />
              <button type="submit" disabled={goalSaving}
                className="px-4 py-2 bg-accent text-on-accent text-sm font-bold rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50">
                {goalSaving ? 'Saving…' : 'Add Goal'}
              </button>
            </form>
          )}

          {goals.length === 0 ? (
            <p className="text-secondary-60 text-sm italic">No goals yet. Set your first goal above.</p>
          ) : (
            <div className="space-y-3">
              {goals.map(g => (
                <div key={g.id} className={`rounded-xl border p-4 group transition-colors ${
                  g.achieved ? 'border-success/20 bg-success/5' : 'border-border bg-surface'
                }`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleGoal(g)}
                      className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        g.achieved ? 'bg-success border-success text-white' : 'border-border hover:border-accent'
                      }`}>
                      {g.achieved && <span className="text-[10px] text-white">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${g.achieved ? 'line-through text-secondary' : 'text-foreground'}`}>
                        {g.title}
                      </p>
                      <p className="text-xs text-secondary mt-0.5">{g.target}</p>
                      {g.due_date && !g.achieved && (
                        <p className="text-xs text-secondary mt-1">
                          Target: {new Date(g.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                    <button onClick={() => deleteGoal(g.id)}
                      className="text-danger text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
