'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkoutWeekGrid } from '@/components/workout/workout-week-grid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import type { WorkoutWeek } from '@/lib/types'

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
  const [showApproveModal, setShowApproveModal] = useState(false)
  const weekStart = getMondayOfCurrentWeek()
  const supabase = createClient()

  useEffect(() => { loadWeek() }, [])

  async function loadWeek() {
    setLoading(true)
    const { data } = await supabase.from('workout_weeks')
      .select('id, workouts, status').eq('week_start', weekStart)
      .in('status', ['draft', 'published']).order('created_at', { ascending: false }).limit(1).maybeSingle()
    setWeek(data as any)
    setLoading(false)
  }

  async function handleGenerate() {
    setGenerating(true)
    const res = await fetch('/api/workouts/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart })
    })
    if (res.ok) await loadWeek()
    setGenerating(false)
  }

  async function handleApprove() {
    await fetch('/api/workouts/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: week!.id })
    })
    setShowApproveModal(false)
    await loadWeek()
  }

  async function handleDiscard() {
    await fetch('/api/workouts/discard', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: week!.id })
    })
    await loadWeek()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white">Weekly Program</h1>
          <p className="text-secondary text-sm mt-1">Week of {weekStart}</p>
        </div>
        <div className="flex items-center gap-3">
          {week?.status && <Badge variant={week.status as any} label={week.status.charAt(0).toUpperCase() + week.status.slice(1)} />}
          {week?.status === 'draft' && (
            <>
              <Button variant="danger" onClick={handleDiscard}>Discard</Button>
              <Button onClick={handleGenerate} disabled={generating}>Regenerate</Button>
              <Button onClick={() => setShowApproveModal(true)}>Approve & Publish</Button>
            </>
          )}
          {(!week || week.status === 'published') && (
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating…' : 'Generate This Week'}
            </Button>
          )}
        </div>
      </div>

      <WorkoutWeekGrid week={week?.workouts ?? null} loading={loading || generating} />

      <Modal
        open={showApproveModal}
        title="Publish This Week?"
        description="This will make the workouts visible to all members and send them an email notification."
        confirmLabel="Approve & Publish"
        onConfirm={handleApprove}
        onCancel={() => setShowApproveModal(false)}
      />
    </div>
  )
}
