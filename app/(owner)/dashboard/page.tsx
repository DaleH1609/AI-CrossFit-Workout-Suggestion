'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkoutWeekGrid } from '@/components/workout/workout-week-grid'
import { WorkoutEditModal } from '@/components/workout/workout-edit-modal'
import { ScalingEditModal } from '@/components/workout/scaling-edit-modal'
import { MovementIntelligencePanel } from '@/components/workout/MovementIntelligencePanel'
import { RationalePanel } from '@/components/workout/rationale-panel'
import type { WorkoutRationale } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import type { WorkoutDay, WorkoutWeek } from '@/lib/types'

function Spinner() {
  return (
    <svg aria-hidden="true" className="animate-spin -ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function getMondayOfCurrentWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

export default function DashboardPage() {
  const [week, setWeek] = useState<{ id: string; workouts: WorkoutWeek; status: string; rationale?: WorkoutRationale | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [creatingManual, setCreatingManual] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [editingDay, setEditingDay] = useState<WorkoutDay | null>(null)
  const [editingScalingDay, setEditingScalingDay] = useState<WorkoutDay | null>(null)
  const [error, setError] = useState<string | null>(null)
  const weekStart = getMondayOfCurrentWeek()
  const supabase = createClient()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadWeek() }, [])

  async function loadWeek() {
    setLoading(true)
    try {
      const { data } = await supabase.from('workout_weeks')
        .select('id, workouts, status, rationale').eq('week_start', weekStart)
        .in('status', ['draft', 'published']).order('created_at', { ascending: false }).limit(1).maybeSingle()
      setWeek(data as { id: string; workouts: WorkoutWeek; status: string; rationale?: WorkoutRationale | null } | null)
    } catch (err) {
      console.error('[dashboard] loadWeek failed', err)
      setError('Failed to load workout data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    const res = await fetch('/api/workouts/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart })
    })
    if (res.ok) {
      const apiData = await res.json() as { week?: { id: string; workouts: WorkoutWeek; status: string; rationale?: WorkoutRationale | null } }
      if (apiData.week?.workouts?.length) {
        setWeek({ id: apiData.week.id, workouts: apiData.week.workouts, status: apiData.week.status ?? 'draft', rationale: apiData.week.rationale })
      } else {
        await loadWeek()
      }
    } else {
      const data = await res.json()
      setError((data as { error?: string }).error || 'Generation failed')
    }
    setGenerating(false)
  }

  async function handleApprove() {
    if (publishing) return
    setPublishing(true)
    const res = await fetch('/api/workouts/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: week!.id })
    })
    setShowApproveModal(false)
    if (!res.ok) {
      const data = await res.json()
      setError((data as { error?: string }).error || 'Failed to publish week')
    }
    await loadWeek()
    setPublishing(false)
  }

  async function handleCreateManual() {
    setCreatingManual(true)
    setError(null)
    const res = await fetch('/api/workouts/create-manual', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart })
    })
    if (res.ok) {
      const apiData = await res.json() as { week?: { id: string; workouts: WorkoutWeek; status: string; rationale?: WorkoutRationale | null } }
      if (apiData.week) {
        setWeek({ id: apiData.week.id, workouts: apiData.week.workouts, status: apiData.week.status ?? 'draft', rationale: apiData.week.rationale })
      } else {
        await loadWeek()
      }
    } else {
      const data = await res.json()
      setError((data as { error?: string }).error || 'Failed to create manual week')
    }
    setCreatingManual(false)
  }

  async function handleDiscard() {
    if (publishing) return
    setPublishing(true)
    await fetch('/api/workouts/discard', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: week!.id })
    })
    await loadWeek()
    setPublishing(false)
  }

  function handleDaySaved(updated: WorkoutDay) {
    if (!week) return
    const updatedWorkouts = week.workouts.map(d =>
      d.day === updated.day ? updated : d
    )
    setWeek({ ...week, workouts: updatedWorkouts })
  }

  return (
    <div>
      {/* Header. Previously a text-3xl title and a flat row of four equally
          weighted buttons — the audit's "no hierarchy" and "headlines lack
          presence" cases. Now: an eyebrow badge, a display-scale title, and a
          deliberate primary / secondary / tertiary button ranking. */}
      <header className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">
              Week of {weekStart}
            </span>
            {week?.status && (
              <Badge
                variant={week.status as 'draft' | 'published'}
                label={week.status.charAt(0).toUpperCase() + week.status.slice(1)}
              />
            )}
          </div>
          <h1 className="font-display uppercase text-foreground leading-[0.9] tracking-[-0.02em] text-[clamp(2.25rem,4.5vw,3.5rem)]">Weekly program</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {week?.status === 'draft' && (
            <>
              {/* Destructive action demoted to a text link — it should not carry
                  the same visual weight as the action you actually want. */}
              <button
                onClick={handleDiscard}
                disabled={publishing}
                className="font-mono text-[11px] uppercase tracking-[0.15em] text-secondary underline-offset-4 hover:text-danger hover:underline transition-colors duration-200 ease-expo disabled:opacity-50"
              >
                Discard
              </button>
              <Button variant="ghost" size="lg" shape="pill" onClick={handleGenerate} disabled={generating}>
                {generating ? <><Spinner />Regenerating…</> : 'Regenerate'}
              </Button>
              <Button variant="solid" size="lg" shape="pill" onClick={() => setShowApproveModal(true)} disabled={publishing}>
                {publishing ? 'Publishing…' : 'Approve & Publish'}
              </Button>
            </>
          )}
          {(!week || week.status === 'published') && (
            <>
              <Button variant="ghost" size="lg" shape="pill" onClick={handleCreateManual} disabled={creatingManual}>
                {creatingManual ? <><Spinner />Creating…</> : 'Create Manually'}
              </Button>
              <Button variant="solid" size="lg" shape="pill" onClick={handleGenerate} disabled={generating}>
                {generating ? <><Spinner />Generating…</> : 'Generate This Week'}
              </Button>
            </>
          )}
        </div>
      </header>

      <RationalePanel rationale={week?.rationale ?? null} />
      <MovementIntelligencePanel />
      {generating && (
        <div className="mb-8 flex items-center gap-4 rounded-card border border-accent/20 bg-accent-5 px-5 py-4 shadow-inset-hi">
          <Spinner />
          <div>
            <p className="text-sm font-medium text-foreground">Building your week</p>
            <p className="mt-0.5 text-sm text-secondary text-pretty">
              Writing strength work, metcons and scaling for all seven days. Usually 15–30 seconds.
            </p>
          </div>
        </div>
      )}
      {/* Inline, not an alert(). Audit: "No error states — add clear, inline
          error messages for forms. Do not use window.alert()." */}
      {error && (
        <div role="alert" className="mb-8 rounded-card border border-danger/30 bg-danger-10 px-5 py-4">
          <p className="text-sm font-medium text-danger">Couldn&apos;t complete that</p>
          <p className="mt-0.5 text-sm text-secondary text-pretty">{error}</p>
        </div>
      )}
      <WorkoutWeekGrid
        week={week?.workouts ?? null}
        loading={loading || generating}
        isDraft={week?.status === 'draft'}
        onEdit={setEditingDay}
        onEditScaling={setEditingScalingDay}
      />

      <Modal
        open={showApproveModal}
        title="Publish This Week?"
        description="This will make the workouts visible to all members and send them an email notification."
        confirmLabel="Approve & Publish"
        onConfirm={handleApprove}
        onCancel={() => setShowApproveModal(false)}
      />

      {editingDay && week && (
        <WorkoutEditModal
          day={editingDay}
          weekId={week.id}
          onSave={handleDaySaved}
          onClose={() => setEditingDay(null)}
        />
      )}

      {editingScalingDay && week && (
        <ScalingEditModal
          day={editingScalingDay}
          weekId={week.id}
          onSave={handleDaySaved}
          onClose={() => setEditingScalingDay(null)}
        />
      )}

    </div>
  )
}
