'use client'
import { useEffect, useState } from 'react'
import { ScheduleTemplate, ScheduleDefaults } from '@/lib/types'
import { CapacityDefaults } from '@/components/schedule/capacity-defaults'
import { ScheduleGrid } from '@/components/schedule/schedule-grid'

export default function SchedulePage() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [defaults, setDefaults] = useState<ScheduleDefaults>({
    globalDefault: 20,
    dayDefaults: {},
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/schedule/templates')
      const data = await res.json()
      setTemplates(data.templates ?? [])
      setDefaults({
        globalDefault: data.globalDefault ?? 20,
        dayDefaults: data.dayDefaults ?? {},
      })
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-400 text-sm">Loading schedule...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Class Schedule</h1>
        <p className="text-sm text-yellow-400">↻ This schedule repeats every week automatically</p>
      </div>

      <CapacityDefaults defaults={defaults} onUpdate={setDefaults} />

      <ScheduleGrid
        initialTemplates={templates}
        defaults={defaults}
      />
    </div>
  )
}
