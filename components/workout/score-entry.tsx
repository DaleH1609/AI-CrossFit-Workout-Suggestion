'use client'
import { useState, useEffect } from 'react'

type ScoreType = 'time' | 'reps' | 'weight' | 'rounds_reps' | 'distance' | 'calories' | 'pass_fail' | 'notes_only'

interface ScoreEntryProps {
  workoutDate: string
  instanceId?: string
  onSaved?: () => void
}

interface ScoreRow {
  id: string
  score_type: ScoreType
  score_value: number | null
  score_text: string | null
  rx: boolean
  notes: string | null
  is_mine: boolean
  users: { name: string } | null
}

const SCORE_TYPE_LABELS: Record<ScoreType, string> = {
  time: 'Time (mm:ss)',
  reps: 'Reps',
  weight: 'Weight (kg)',
  rounds_reps: 'Rounds + Reps',
  distance: 'Distance (m)',
  calories: 'Calories',
  pass_fail: 'Pass / Fail',
  notes_only: 'Notes only',
}

function formatScore(score: ScoreRow): string {
  switch (score.score_type) {
    case 'time': {
      if (score.score_value == null) return '—'
      const secs = Math.round(score.score_value)
      const m = Math.floor(secs / 60)
      const s = secs % 60
      return `${m}:${String(s).padStart(2, '0')}`
    }
    case 'reps': return score.score_value != null ? `${score.score_value} reps` : '—'
    case 'weight': return score.score_value != null ? `${score.score_value} kg` : '—'
    case 'distance': return score.score_value != null ? `${score.score_value} m` : '—'
    case 'calories': return score.score_value != null ? `${score.score_value} cal` : '—'
    case 'rounds_reps': return score.score_text ?? '—'
    case 'pass_fail': return score.score_value === 1 ? 'Pass' : 'Fail'
    case 'notes_only': return score.notes ?? '—'
    default: return '—'
  }
}

function parseTimeToSeconds(val: string): number | null {
  const parts = val.split(':')
  if (parts.length === 2) {
    const [m, s] = parts.map(Number)
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s
  }
  const num = Number(val)
  return isNaN(num) ? null : num
}

export function ScoreEntry({ workoutDate, instanceId, onSaved }: ScoreEntryProps) {
  const [open, setOpen] = useState(false)
  const [scoreType, setScoreType] = useState<ScoreType>('time')
  const [scoreInput, setScoreInput] = useState('')
  const [rx, setRx] = useState(true)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [leaderboard, setLeaderboard] = useState<ScoreRow[]>([])
  const [loadingBoard, setLoadingBoard] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoadingBoard(true)
    fetch(`/api/scores?date=${workoutDate}`)
      .then(r => r.json())
      .then((data: { scores?: ScoreRow[] }) => {
        setLeaderboard(data.scores ?? [])
        const mine = (data.scores ?? []).find(s => s.is_mine)
        if (mine) {
          setScoreType(mine.score_type)
          if (mine.score_type === 'time' && mine.score_value != null) {
            const m = Math.floor(mine.score_value / 60)
            const s = Math.round(mine.score_value % 60)
            setScoreInput(`${m}:${String(s).padStart(2, '0')}`)
          } else if (mine.score_value != null) {
            setScoreInput(String(mine.score_value))
          } else if (mine.score_text) {
            setScoreInput(mine.score_text)
          }
          setRx(mine.rx)
          setNotes(mine.notes ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBoard(false))
  }, [open, workoutDate])

  async function handleSave() {
    setSaving(true)
    let score_value: number | null = null
    let score_text: string | null = null

    if (scoreType === 'time') {
      score_value = parseTimeToSeconds(scoreInput)
    } else if (scoreType === 'rounds_reps') {
      score_text = scoreInput.trim()
    } else if (scoreType === 'pass_fail') {
      score_value = scoreInput === 'pass' ? 1 : 0
    } else if (scoreType !== 'notes_only') {
      score_value = parseFloat(scoreInput)
    }

    await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workout_date: workoutDate, score_type: scoreType, score_value, score_text, rx, notes, instance_id: instanceId }),
    })

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
    onSaved?.()

    // Reload leaderboard
    const res = await fetch(`/api/scores?date=${workoutDate}`)
    const data = await res.json() as { scores?: ScoreRow[] }
    setLeaderboard(data.scores ?? [])
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-foreground transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        {open ? 'Hide scores' : 'Log score / Leaderboard'}
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-border bg-surface p-4 space-y-4">
          {/* Score entry */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Log Your Score</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={scoreType}
                onChange={e => { setScoreType(e.target.value as ScoreType); setScoreInput('') }}
                className="col-span-2 px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent"
              >
                {(Object.entries(SCORE_TYPE_LABELS) as [ScoreType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>

              {scoreType !== 'notes_only' && (
                <>
                  {scoreType === 'pass_fail' ? (
                    <div className="col-span-2 flex gap-2">
                      {['pass', 'fail'].map(v => (
                        <button key={v} onClick={() => setScoreInput(v)}
                          className={`flex-1 py-2 rounded-btn text-sm font-semibold border transition-colors ${scoreInput === v ? 'border-accent bg-accent/10 text-accent' : 'border-border text-secondary hover:border-foreground/30'}`}>
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type={scoreType === 'time' || scoreType === 'rounds_reps' ? 'text' : 'number'}
                      value={scoreInput}
                      onChange={e => setScoreInput(e.target.value)}
                      placeholder={scoreType === 'time' ? '14:22' : scoreType === 'rounds_reps' ? '12+5' : '0'}
                      className="col-span-2 px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent"
                    />
                  )}
                  <button
                    onClick={() => setRx(true)}
                    className={`py-2 rounded-btn text-xs font-bold border transition-colors ${rx ? 'border-accent bg-accent/10 text-accent' : 'border-border text-secondary'}`}
                  >Rx</button>
                  <button
                    onClick={() => setRx(false)}
                    className={`py-2 rounded-btn text-xs font-bold border transition-colors ${!rx ? 'border-accent bg-accent/10 text-accent' : 'border-border text-secondary'}`}
                  >Scaled</button>
                </>
              )}
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent resize-none"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-2 px-4 py-2 bg-accent text-background text-xs font-bold tracking-wider rounded-btn hover:bg-accent-90 transition-colors disabled:opacity-50"
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Score'}
            </button>
          </div>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Leaderboard</p>
              {loadingBoard ? (
                <p className="text-secondary text-xs">Loading…</p>
              ) : (
                <div className="space-y-1.5">
                  {leaderboard.map((s, i) => (
                    <div key={s.id} className={`flex items-center justify-between text-sm px-2 py-1.5 rounded ${s.is_mine ? 'bg-accent/10 border border-accent/20' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-secondary text-xs w-4 text-right">{i + 1}</span>
                        <span className={s.is_mine ? 'text-foreground font-medium' : 'text-foreground/70'}>
                          {s.users?.name ?? 'Member'}
                        </span>
                        {!s.rx && <span className="text-[10px] text-secondary border border-border rounded px-1">Sc</span>}
                      </div>
                      <span className={`font-mono text-sm ${s.is_mine ? 'text-accent font-semibold' : 'text-foreground/70'}`}>
                        {formatScore(s)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
