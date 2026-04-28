'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkoutWeekGrid } from '@/components/workout/workout-week-grid'
import { WorkoutEditModal } from '@/components/workout/workout-edit-modal'
import { ScalingEditModal } from '@/components/workout/scaling-edit-modal'
import { MovementIntelligencePanel } from '@/components/workout/MovementIntelligencePanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import Link from 'next/link'
import type { WorkoutDay, WorkoutWeek } from '@/lib/types'

const ONBOARDING_STEPS = [
  { label: 'Set your gym style', desc: 'Upload sample workouts so the AI learns your programming style.', href: '/style-profile' },
  { label: 'Set up your schedule', desc: 'Add recurring class slots and set capacities.', href: '/schedule' },
  { label: 'Invite members', desc: 'Send invite links so your athletes can book classes.', href: '/members' },
]

function OnboardingPanel({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  return (
    <div className="mt-8 rounded-lg border border-border bg-surface p-8 max-w-2xl">
      <h2 className="font-display text-xl font-semibold text-foreground mb-1">Welcome to KOVA</h2>
      <p className="text-sm text-secondary mb-8">Three things to do before you generate your first week:</p>
      <ol className="space-y-5 mb-10">
        {ONBOARDING_STEPS.map((step, i) => (
          <li key={step.href} className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full border border-border flex items-center justify-center text-xs text-secondary font-medium">{i + 1}</span>
            <div>
              <Link href={step.href} className="text-sm font-medium text-foreground hover:text-accent transition-colors">
                {step.label} →
              </Link>
              <p className="text-xs text-secondary mt-0.5">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-secondary mb-4">Or skip straight to generating — the AI will use built-in defaults.</p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="inline-flex items-center px-4 py-2 rounded-btn text-sm font-medium bg-accent text-background hover:bg-accent/90 transition-all disabled:opacity-50"
      >
        {generating ? <><Spinner />Generating…</> : 'Generate This Week'}
      </button>
    </div>
  )
}

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
  const [week, setWeek] = useState<{ id: string; workouts: WorkoutWeek; status: string } | null>(null)
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
    const { data } = await supabase.from('workout_weeks')
      .select('id, workouts, status').eq('week_start', weekStart)
      .in('status', ['draft', 'published']).order('created_at', { ascending: false }).limit(1).maybeSingle()
    setWeek(data as { id: string; workouts: WorkoutWeek; status: string } | null)
    setLoading(false)
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    const res = await fetch('/api/workouts/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart })
    })
    if (res.ok) {
      const apiData = await res.json() as { week?: { id: string; workouts: WorkoutWeek; status: string } }
      if (apiData.week?.workouts?.length) {
        setWeek({ id: apiData.week.id, workouts: apiData.week.workouts, status: apiData.week.status ?? 'draft' })
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
      const apiData = await res.json() as { week?: { id: string; workouts: WorkoutWeek; status: string } }
      if (apiData.week) {
        setWeek({ id: apiData.week.id, workouts: apiData.week.workouts, status: apiData.week.status ?? 'draft' })
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-foreground">Weekly Program</h1>
          <p className="text-secondary text-sm mt-1">Week of {weekStart}</p>
        </div>
        <div className="flex items-center gap-3">
          {week?.status && <Badge variant={week.status as 'draft' | 'published'} label={week.status.charAt(0).toUpperCase() + week.status.slice(1)} />}
          {week?.status === 'draft' && (
            <>
              <Button variant="danger" onClick={handleDiscard} disabled={publishing}>Discard</Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? <><Spinner />Regenerating…</> : 'Regenerate'}
              </Button>
              <Button onClick={() => setShowApproveModal(true)} disabled={publishing}>{publishing ? 'Publishing…' : 'Approve & Publish'}</Button>
            </>
          )}
          {(!week || week.status === 'published') && (
            <>
              <Button variant="ghost" onClick={handleCreateManual} disabled={creatingManual}>
                {creatingManual ? <><Spinner />Creating…</> : 'Create Manually'}
              </Button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center px-4 py-2 rounded-btn text-sm font-medium bg-accent text-background hover:bg-accent/90 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {generating ? <><Spinner />Generating…</> : 'Generate This Week'}
              </button>
            </>
          )}
        </div>
      </div>

      <MovementIntelligencePanel />
      {generating && (
        <div className="flex items-center gap-2 mb-4 text-secondary text-sm">
          <Spinner />
          AI is building your workout program — this usually takes 15–30 seconds…
        </div>
      )}
      {error && <p className="text-danger mb-4">{error}</p>}

      {!loading && !week && !generating ? (
        <OnboardingPanel onGenerate={handleGenerate} generating={generating} />
      ) : (
        <WorkoutWeekGrid
          week={week?.workouts ?? null}
          loading={loading || generating}
          isDraft={week?.status === 'draft'}
          onEdit={setEditingDay}
          onEditScaling={setEditingScalingDay}
        />
      )}

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
