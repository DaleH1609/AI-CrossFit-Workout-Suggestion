'use client'
import { useState } from 'react'

interface Props {
  memberId: string
}

export function MemberScaling({ memberId }: Props) {
  const [workoutText, setWorkoutText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ memberName: string; scaling: string } | null>(null)
  const [error, setError] = useState('')

  async function handleGenerate() {
    if (!workoutText.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/admin/scaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, workoutText }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? 'Failed to generate scaling'); return }
      setResult(data)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-secondary uppercase tracking-widest mb-2">
          Today&apos;s Workout
        </label>
        <textarea
          value={workoutText}
          onChange={e => setWorkoutText(e.target.value)}
          placeholder={"e.g.\n3 rounds:\n21 Thrusters 43/29 kg\n21 Pull-ups"}
          rows={6}
          className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent transition-colors resize-none font-mono"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !workoutText.trim()}
        className="w-full py-2.5 bg-accent text-on-accent text-sm font-bold rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50 active:scale-[0.98]"
      >
        {loading ? 'Generating…' : '✦ Generate Scaling'}
      </button>

      {error && (
        <div className="px-3 py-2.5 rounded-lg border border-danger/20 bg-danger/5 text-sm text-danger">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-accent/20 bg-accent-5 p-4 space-y-2">
          <p className="text-xs font-semibold text-accent uppercase tracking-widest">
            Scaling for {result.memberName}
          </p>
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
            {result.scaling}
          </pre>
          <button
            onClick={() => { setResult(null); setWorkoutText('') }}
            className="text-xs text-secondary hover:text-foreground transition-colors mt-1"
          >
            Clear
          </button>
        </div>
      )}

      <p className="text-xs text-secondary/60">
        AI uses this member&apos;s score history and skills to personalise the recommendation.
      </p>
    </div>
  )
}
